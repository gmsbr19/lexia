// Word-style block-level pagination for the flexible document editor.
//
// ProseMirror keeps content in ONE continuous flow, so the editor would normally
// let text spill across A4 page boundaries (over the next page's letterhead /
// margins). This plugin measures the REAL rendered position of each top-level
// block (from INVARIANT geometry — heights + natural margins, not rendered tops) and,
// for the block that would overflow a page, inserts:
//   1. a "page-gap" widget spacer that pushes it down to the next page, and
//   2. a node decoration that zeroes that block's top margin.
//
// (2) is essential: a spacer breaks the margin-collapse at that boundary, so the
// block's own top margin would otherwise re-appear and the error (one margin per
// page) would ACCUMULATE down the document. Zeroing it keeps every page's first line
// at the top safe-area.
//
// BLOCK level: a single block taller than one page still overflows (real line
// splitting needs a layout engine); the exported PDF stays the paginated truth.
// Stable + cheap: positions come from heights + natural margins (decoration-invariant)
// so it converges in one pass; every DOM read is batched before the single write →
// ONE reflow per recompute, and recompute is debounced so a burst of keystrokes
// measures only once.
import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view"

export const paginationKey = new PluginKey("lexPagination")

const PAGE_W_MM = 210
const PAGE_H_MM = 297

interface Computed {
  set: DecorationSet
  sig: string
}

function computeDecorations(view: EditorView): Computed {
  const empty: Computed = { set: DecorationSet.empty, sig: "" }
  const content = view.dom as HTMLElement
  const paper = content.closest("[data-doc-paper]") as HTMLElement | null
  if (!paper) return empty

  // ZOOM-SAFE measurement. The editor's zoom control uses CSS `zoom`, which scales
  // getBoundingClientRect() but NOT the layout-space APIs (clientWidth / getComputedStyle).
  // So block heights (rect) come back ZOOMED while pageH (clientWidth) and the padding/
  // margins (getComputedStyle) stay at LAYOUT scale — mismatching by the zoom factor
  // (→ too few page breaks, text spilling over the letterhead footer). Fix: detect the
  // factor `z` and divide ONLY the rect-based reads (heights) by it, so everything lives
  // in the same LAYOUT space as the spacers/minHeight (px) and the mm background tile;
  // `zoom` then scales the rendered output uniformly. z==1 (no zoom) ⇒ heights/1, i.e.
  // byte-identical to the pre-zoom behavior.
  const paperRect = paper.getBoundingClientRect()
  const clientW = paper.clientWidth || paperRect.width
  const z = clientW > 0 ? paperRect.width / clientW : 1
  const ps = getComputedStyle(paper)
  const topPx = parseFloat(ps.paddingTop) || 0
  const botPx = parseFloat(ps.paddingBottom) || 0
  const pageH = (clientW * PAGE_H_MM) / PAGE_W_MM // clientWidth == 210mm (layout)
  const usableH = pageH - topPx - botPx
  if (!Number.isFinite(usableH) || usableH <= 20) return empty

  // Build a margin-collapse-aware NATURAL layout from geometry that is INVARIANT to
  // the pagination decorations: each block's border-box height + its natural top/bottom
  // margins. None of these change when we add a page-gap spacer or zero a page-start
  // block's top margin — so positions are stable frame to frame and converge in ONE
  // pass (heights + natural margins don't move, so an overflow decision near a page
  // boundary can't flip → no "vibrating text").
  type Block = { naturalTop: number; height: number; offset: number; size: number }
  const els: HTMLElement[] = []
  content.childNodes.forEach((n) => {
    if (n instanceof HTMLElement && !n.classList.contains("lex-page-gap")) els.push(n)
  })

  // start position + size of each top-level doc node (aligns 1:1 with the blocks)
  const nodes: { offset: number; size: number }[] = []
  view.state.doc.forEach((node, offset) => nodes.push({ offset, size: node.nodeSize }))

  const count = Math.min(els.length, nodes.length)

  // ── READ PASS — every DOM read happens here, before any write, so the browser does
  //    ONE reflow for the whole document instead of one per block. Natural margins are
  //    read once per block TYPE (tag+class) into a cache; page-start blocks (which carry
  //    our inline `margin-top:0`) reuse a sibling's cached value instead of being mutated.
  const heights: number[] = new Array(count)
  const keys: string[] = new Array(count)
  const overridden: boolean[] = new Array(count)
  const marginCache = new Map<string, { top: number; bottom: number }>()
  for (let i = 0; i < count; i++) {
    const el = els[i]
    heights[i] = el.getBoundingClientRect().height / z // border box — margin-independent; → layout
    keys[i] = `${el.tagName}|${el.className}`
    overridden[i] = el.style.marginTop === "0px" // our page-start decoration
    if (!overridden[i] && !marginCache.has(keys[i])) {
      const cs = getComputedStyle(el)
      marginCache.set(keys[i], { top: parseFloat(cs.marginTop) || 0, bottom: parseFloat(cs.marginBottom) || 0 })
    }
  }
  const marginsFor = (i: number): { top: number; bottom: number } => {
    const cached = marginCache.get(keys[i])
    if (cached) return cached
    // cache miss ⟹ EVERY block of this type is currently a page-start (rare). Read it
    // directly — still a pure read (before the single write below), so no extra reflow.
    const cs = getComputedStyle(els[i])
    const m = { top: overridden[i] ? 0 : parseFloat(cs.marginTop) || 0, bottom: parseFloat(cs.marginBottom) || 0 }
    marginCache.set(keys[i], m)
    return m
  }

  // ── natural layout (margin-collapse aware; pure JS, no DOM) ─────────────────
  const blocks: Block[] = new Array(count)
  let cursor = topPx // y of the content edge (paper border-box top → padding top)
  let prevMarginBottom = 0 // 0 at the padding edge: the first block's top margin shows
  for (let i = 0; i < count; i++) {
    const m = marginsFor(i)
    const top = cursor + Math.max(prevMarginBottom, m.top) // collapsed margin above
    blocks[i] = { naturalTop: top, height: heights[i], offset: nodes[i].offset, size: nodes[i].size }
    cursor = top + heights[i]
    prevMarginBottom = m.bottom
  }

  const decos: Decoration[] = []
  const sigParts: string[] = []
  let page = 0
  let shift = 0 // total spacer height added so far
  const EPS = 1

  for (let i = 0; i < count; i++) {
    const b = blocks[i]
    const top = b.naturalTop + shift // where this block currently renders (paper y)
    const safeBottom = (page + 1) * pageH - botPx
    if (i > 0 && top + b.height > safeBottom + EPS) {
      page += 1
      const safeTop = page * pageH + topPx // top safe-area of the new page
      const need = Math.round(safeTop - top)
      if (need > 1) {
        const { offset, size } = b
        // (1) vertical gap to the next page
        decos.push(
          Decoration.widget(
            offset,
            () => {
              const d = document.createElement("div")
              d.className = "lex-page-gap"
              d.style.height = `${need}px`
              d.style.userSelect = "none"
              d.style.pointerEvents = "none"
              d.setAttribute("contenteditable", "false")
              return d
            },
            { side: -1, key: `gap-${offset}-${need}` },
          ),
        )
        // (2) kill this block's top margin so the spacer-broken collapse doesn't
        //     re-add (and accumulate) a margin at the top of every page
        decos.push(Decoration.node(offset, offset + size, { style: "margin-top:0" }, { key: `mt0-${offset}` }))
        sigParts.push(`g${offset}:${need}`)
        shift += need
      }
    }
  }

  // grow the sheet to a whole number of pages so the last page looks complete
  paper.style.minHeight = `${(page + 1) * pageH}px`

  return { set: DecorationSet.create(view.state.doc, decos), sig: sigParts.join("|") }
}

interface PgState {
  deco: DecorationSet
  version: number // bumps only when the layout could have changed (doc edit / margins)
  forced: boolean // true when the bump came from an explicit "recompute" meta → dispatch past the sig guard
}

export const Pagination = Extension.create({
  name: "lexPagination",
  addProseMirrorPlugins() {
    let raf = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let lastVersion = -1
    let pendingForce = false // next measure dispatches even if the sig is unchanged
    let lastSig = " " // force the first compute to differ
    return [
      new Plugin({
        key: paginationKey,
        state: {
          init: (): PgState => ({ deco: DecorationSet.empty, version: 0, forced: false }),
          apply(tr, old: PgState): PgState {
            const meta = tr.getMeta(paginationKey)
            // our own recompute result — adopt it WITHOUT bumping the version, so it
            // doesn't re-trigger another recompute (no loop)
            if (meta instanceof DecorationSet) return { deco: meta, version: old.version, forced: false }
            // bump ONLY on a real edit or an explicit "recompute" (e.g. margins moved).
            // A selection-only transaction leaves the version alone → dragging to select
            // text never re-runs the reflow-heavy measurement that disrupts the native
            // browser selection.
            const recompute = meta === "recompute"
            const version = tr.docChanged || recompute ? old.version + 1 : old.version
            return { deco: old.deco.map(tr.mapping, tr.doc), version, forced: recompute }
          },
        },
        props: {
          decorations(state) {
            return (paginationKey.getState(state) as PgState).deco
          },
        },
        view(view) {
          const measure = () => {
            raf = 0
            const { set, sig } = computeDecorations(view)
            if (pendingForce || sig !== lastSig) {
              lastSig = sig
              pendingForce = false
              view.dispatch(view.state.tr.setMeta(paginationKey, set))
            }
          }
          // Debounce: a burst of keystrokes coalesces into a SINGLE measurement once
          // typing pauses (~150ms) → zero reflow during active typing. The rAF then
          // measures after layout has settled.
          const schedule = (force: boolean) => {
            if (force) pendingForce = true
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
              timer = null
              if (raf) cancelAnimationFrame(raf)
              raf = requestAnimationFrame(measure)
            }, 150)
          }
          // recompute only when the version changed (real edit / margins) — NOT on
          // every update, which also fires for selection changes.
          const maybeSchedule = () => {
            const st = paginationKey.getState(view.state) as PgState
            if (st.version !== lastVersion) {
              lastVersion = st.version
              schedule(st.forced)
            }
          }
          maybeSchedule() // initial layout
          return {
            update: () => maybeSchedule(),
            destroy: () => {
              if (timer) clearTimeout(timer)
              if (raf) cancelAnimationFrame(raf)
            },
          }
        },
      }),
    ]
  },
})
