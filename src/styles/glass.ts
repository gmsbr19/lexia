import type { CSSProperties } from "react"

/** Inline-style helper for plain `style={}` consumers that need an extra
 * outer elevation shadow layered under the shared glass bevel, e.g.
 * `style={{ ...glassElevation("0 40px 100px rgba(2,13,37,0.42)"), width: 720 }}`. */
export function glassElevation(shadow: string): CSSProperties {
  return { "--lex-elevation": shadow } as CSSProperties
}