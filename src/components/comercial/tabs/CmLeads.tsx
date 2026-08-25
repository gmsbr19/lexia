"use client";

// LexIA · Comercial — Tela · Leads sobre o grid "Controles de Visão" (ViewGrid).
// Constrói o schema (colunas + enums coloridos + pessoas) a partir do dataset,
// achata os leads em linhas de visão e liga as ações reais (editar, lote, mover
// etapa, converter/perder, importar). Kanban com arraste no estilo do design.
// Visões salvas por usuário no servidor (User.crmViewPrefs, gridId "oportunidades").
import React, { useCallback, useMemo, useState } from "react";
import { apiSend } from "@/lib/client/api";
import { toast } from "@/lib/client/toast";
import { useOptimisticRows } from "@/lib/client/useOptimisticRows";
import { useViewGridStore } from "@/lib/client/useViewGridStore";
import {
  ViewGrid, makeDefaultState, vgFmtMoney,
  type VgSchema, type VgColumn, type VgRow, type VgSavedView, type VgGridStore,
  type VgEnumRegistry, type VgEnumOrder, type VgPerson, type VgBulkField, type VgGroup, type VgIconName,
} from "@/components/ui/viewgrid";
import { Icon } from "@/components/ui/viewgrid/vg-icons";
import { VgPopover, VgDot, VgAvatar, VgEnumChip } from "@/components/ui/viewgrid/vg-atoms";
import { ORIGEM_COLOR, ORIGEM_LABEL, cmDate, type CmLeadScore } from "../cm-meta";
import { CX_TEMPERATURAS, CX_TEMP_MAP, CxModal } from "../cx-kit";
import type { CmDataset, CmDatasetLead } from "@/lib/comercial/types";
import { resolveAreaColor, resolveAreaLabel, toAreaOptions, useAreasStore } from "@/lib/areas/store";
import { resolveEtapaLabel, toStageOptions, usePipelineStore } from "@/lib/comercial/pipeline/store";

export interface LeadInject { etapa?: string; origem?: string; campId?: number | null; nonce: number }
export interface LastImport { fonte: string; data: string; novos: number; atualizados: number; campanhas?: number }

// ---------- helpers ----------
const H = (h: number, l = 0.72, c = 0.12) => `oklch(${l} ${c} ${h})`;
const personColor = (id: number) => H(((id * 47) % 360), 0.62, 0.13);
const initials = (nome: string) => (nome || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const ORIGEM_ICON: Record<string, VgIconName> = { google_ads: "target", meta_ads: "megaphone", indicacao: "handshake", organico: "globe", outro: "circleDot" };
const TEMP_ICON: Record<string, VgIconName> = { quente: "flame", morno: "sunrise", frio: "moon" };
const QUAL_ENUM: VgEnumRegistry["x"] = {
  A: { c: H(150), d: "Perfil ideal, pronto para avançar" },
  B: { c: H(90), d: "Bom fit, requer nutrição" },
  C: { c: H(55), d: "Fit parcial, baixa prioridade" },
  D: { c: H(25), d: "Fora do perfil / descartado" },
};

// esqueleto ESTÁTICO das colunas (default-visível/ordem) — enums preenchidos no runtime
const LEADS_COLS: VgColumn[] = [
  { key: "nome", label: "Lead", type: "text", fixed: true, def: true, w: 210 },
  { key: "contato", label: "Contato", type: "text", def: true, w: 150 },
  { key: "origem", label: "Origem", type: "enum", enum: "origem", group: true, def: true, w: 140 },
  { key: "campanha", label: "Campanha", type: "enum", enumList: [], group: true, def: false, w: 160 },
  { key: "etapa", label: "Etapa", type: "stage", enum: "etapa", group: true, def: true, w: 150 },
  { key: "area", label: "Área", type: "enum", enum: "area", group: true, def: false, w: 140 },
  { key: "responsavel", label: "Responsável", type: "person", group: true, def: true, w: 170 },
  { key: "temperatura", label: "Temp.", type: "enum", enum: "temperatura", group: true, def: true, w: 110 },
  { key: "qualState", label: "Qualificação", type: "enum", enum: "qualState", group: true, def: true, w: 130 },
  { key: "fit", label: "Fit", type: "num", def: true, w: 92, align: "right", meter: "gold" },
  { key: "engajamento", label: "Engaj.", type: "num", def: true, w: 92, align: "right", meter: "blue" },
  { key: "valorEstimado", label: "Estimado", type: "money", def: true, w: 120, align: "right", agg: "sum" },
  { key: "valorContratado", label: "Contratado", type: "money", def: false, w: 120, align: "right", agg: "sum" },
  { key: "dataEntrada", label: "Entrada", type: "date", def: true, w: 120 },
  { key: "proximaAcao", label: "Próx. ação", type: "date", def: false, w: 120 },
  { key: "dataConv", label: "Conversão", type: "date", def: false, w: 120 },
  { key: "palavraChave", label: "Palavra-chave", type: "text", def: false, w: 160 },
  { key: "cliqueId", label: "Clique ID", type: "enum", enum: "cliqueId", group: true, def: false, w: 110 },
];

type StageMeta = { code: string; label: string; color: string; i: number };

// visões-semente (fiéis ao protótipo)
function leadSeedViews(): VgSavedView[] {
  const all = makeDefaultState({ cols: LEADS_COLS });
  const pipe = makeDefaultState({ cols: LEADS_COLS });
  pipe.groupCols = ["etapa"]; pipe.sort = [{ col: "valorEstimado", dir: "desc" }];
  const hot = makeDefaultState({ cols: LEADS_COLS });
  hot.filters = { type: "group", id: "root", combinator: "E", children: [{ type: "rule", id: "seed-hot", col: "temperatura", op: "in", value: "", value2: "", values: ["Quente"] }] };
  hot.sort = [{ col: "fit", dir: "desc" }];
  return [
    { id: "v-all", name: "Todos os leads", icon: "list", isDefault: true, state: all },
    { id: "v-pipe", name: "Pipeline por etapa", icon: "funnel", state: pipe },
    { id: "v-hot", name: "Quentes a trabalhar", icon: "flame", state: hot },
  ];
}

// ---------- kanban (arraste → mover / converter / perder) ----------
function VgLeadsKanban({ rows, schema, stageList, leadById, onMove, onConvert, onLose, onEdit }: {
  rows: VgRow[]; schema: VgSchema; stageList: StageMeta[]; leadById: Map<number, CmDatasetLead>;
  onMove: (id: number, code: string) => void; onConvert: (l: CmDatasetLead) => void; onLose: (l: CmDatasetLead) => void; onEdit: (l: CmDatasetLead) => void;
}) {
  const tempCol = schema.cols.find((c) => c.key === "temperatura")!;
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const byStage = new Map<string, VgRow[]>();
  stageList.forEach((s) => byStage.set(s.code, []));
  rows.forEach((r) => { const l = leadById.get(Number(r.id)); const code = l?.etapa; if (code && byStage.has(code)) byStage.get(code)!.push(r); });
  return (
    <div className="vc-kanban">
      {stageList.map((st) => {
        const col = byStage.get(st.code) ?? [];
        const sum = col.reduce((s, r) => s + (Number(r.valorEstimado) || 0), 0);
        return (
          <div key={st.code} className={"vc-kan-col" + (over === st.code ? " over" : "")}
            onDragOver={(e) => { e.preventDefault(); if (over !== st.code) setOver(st.code); }}
            onDragLeave={() => setOver((o) => (o === st.code ? null : o))}
            onDrop={(e) => {
              e.preventDefault(); const id = dragId; setDragId(null); setOver(null);
              if (id == null) return; const l = leadById.get(id); if (!l) return;
              if (st.code === "ganho") onConvert(l); else if (st.code === "perdido") onLose(l); else onMove(id, st.code);
            }}>
            <div className="vc-kan-head"><VgDot color={st.color} /><span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{st.label}</span><span className="vc-group-count">{col.length}</span></div>
            <div className="vc-kan-body">
              {col.map((r) => {
                const l = leadById.get(Number(r.id));
                return (
                  <div key={r.id} className={"vc-kan-card" + (dragId === Number(r.id) ? " dragging" : "")} draggable
                    onDragStart={(e) => { setDragId(Number(r.id)); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    onClick={() => l && onEdit(l)}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String(r.nome)}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                      <VgEnumChip schema={schema} col={tempCol} value={r.temperatura} size="sm" />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>{vgFmtMoney(r.valorEstimado)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9 }}><VgAvatar id={r.responsavel ? String(r.responsavel) : null} people={schema.peopleMap} size={20} /><span style={{ fontSize: 11.5, color: "var(--text-subtle)" }}>{r.responsavel ? (schema.peopleMap[String(r.responsavel)]?.nome ?? "—") : "Sem resp."}</span></div>
                  </div>
                );
              })}
              {col.length === 0 && <div style={{ fontSize: 11.5, color: "var(--text-subtle)", textAlign: "center", padding: "16px 0" }}>—</div>}
            </div>
            {sum > 0 && <div style={{ padding: "9px 13px", borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}><span>Estimado</span><b style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text)" }}>{vgFmtMoney(sum)}</b></div>}
          </div>
        );
      })}
    </div>
  );
}

// ---------- menu de ações por linha (⋯) ----------
function LeadRowMenu({ lead, onEdit, onConvert, onMerge, onLose, onReopen, onDelete }: {
  lead: CmDatasetLead; onEdit: (l: CmDatasetLead) => void; onConvert: (l: CmDatasetLead) => void;
  onMerge: (l: CmDatasetLead) => void; onLose: (l: CmDatasetLead) => void; onReopen: (id: number) => void;
  onDelete?: (l: CmDatasetLead) => void;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const terminal = lead.etapa === "ganho" || lead.etapa === "perdido";
  return (
    <>
      <button ref={ref} className="vc-iconbtn" style={{ width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}><Icon name="moreHorizontal" size={15} /></button>
      <VgPopover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={196} align="right">
        <div className="vc-menu-scroll" style={{ padding: 5 }}>
          <button className="vc-menuitem" onClick={() => { setOpen(false); onEdit(lead); }}><Icon name="edit" size={14} />Editar lead</button>
          {lead.etapa !== "ganho" && <button className="vc-menuitem" onClick={() => { setOpen(false); onConvert(lead); }}><Icon name="handshake" size={14} style={{ color: "#2E9E5B" }} />Converter</button>}
          <button className="vc-menuitem" onClick={() => { setOpen(false); onMerge(lead); }}><Icon name="gitMerge" size={14} />Mesclar com cliente</button>
          {lead.etapa !== "perdido" && <button className="vc-menuitem danger" onClick={() => { setOpen(false); onLose(lead); }}><Icon name="x" size={14} />Marcar como perdido</button>}
          {terminal && <><div className="vc-menu-sep" /><button className="vc-menuitem" onClick={() => { setOpen(false); onReopen(lead.id); }}><Icon name="refreshCw" size={14} />Reabrir lead</button></>}
          {onDelete && <><div className="vc-menu-sep" /><button className="vc-menuitem danger" onClick={() => { setOpen(false); onDelete(lead); }}><Icon name="trash2" size={14} />Excluir definitivamente</button></>}
        </div>
      </VgPopover>
    </>
  );
}

// ---------- confirmação de exclusão DEFINITIVA ----------
// Lead não tem soft-delete: apagar remove a linha e, em cascata, os eventos de
// conversão (fila da Captação / feed do Google Ads) e a timeline de atividades.
// Tarefas e eventos de agenda vinculados sobrevivem, só perdem o vínculo.
// Por ser irreversível, exige digitar EXCLUIR — mesmo espírito do fluxo de
// anonimização/mesclagem de contatos.
const PALAVRA_CONFIRMA = "EXCLUIR";

function CmExcluirLeadsModal({ leads, onClose, onConfirm }: {
  leads: CmDatasetLead[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [txt, setTxt] = useState("");
  const ok = txt.trim().toUpperCase() === PALAVRA_CONFIRMA;
  const n = leads.length;
  return (
    <CxModal
      title={n === 1 ? "Excluir oportunidade" : `Excluir ${n} oportunidades`}
      sub="Ação definitiva — não há lixeira nem desfazer"
      icon="trash2"
      width={520}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" disabled={!ok} onClick={() => ok && onConfirm()}>
          Excluir definitivamente
        </button>
      </>}
    >
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 10px" }}>
          {n === 1 ? "Este registro será apagado" : "Estes registros serão apagados"} do banco, junto com
          {" "}<strong style={{ color: "var(--text)" }}>os eventos de conversão</strong> (fila da Captação / feed do Google Ads)
          {" "}e <strong style={{ color: "var(--text)" }}>o histórico de atividades</strong>. Contatos, tarefas e compromissos
          {" "}vinculados permanecem — apenas perdem o vínculo.
        </p>
        <div style={{ maxHeight: 168, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", margin: "0 0 14px", background: "var(--bg-sunken)" }}>
          {leads.map((l) => (
            <div key={l.id} style={{ fontSize: 12.5, color: "var(--text)", padding: "2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {l.nome}{l.contato ? <span style={{ color: "var(--text-subtle)" }}> · {l.contato}</span> : null}
            </div>
          ))}
        </div>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-subtle)", marginBottom: 5 }}>
          Digite <strong style={{ color: "var(--text)" }}>{PALAVRA_CONFIRMA}</strong> para confirmar
        </label>
        <input
          autoFocus
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && ok) onConfirm(); }}
          placeholder={PALAVRA_CONFIRMA}
          style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13 }}
        />
      </div>
    </CxModal>
  );
}

// ---------- menu de importar + novo (toolbarExtra) ----------
function LeadsToolbar({ onImport, onImportMap, onNew }: { onImport: () => void; onImportMap: () => void; onNew: () => void }) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button ref={ref} className="vc-ctrlbtn" onClick={() => setOpen((o) => !o)}><Icon name="download" size={14} style={{ transform: "rotate(180deg)" }} />Importar<Icon name="chevronDown" size={12} style={{ opacity: 0.6 }} /></button>
      <VgPopover anchorRef={ref} open={open} onClose={() => setOpen(false)} width={280} align="right">
        <div className="vc-menu-scroll" style={{ padding: 5 }}>
          <button className="vc-menuitem" style={{ alignItems: "flex-start", flexDirection: "column", gap: 2 }} onClick={() => { setOpen(false); onImport(); }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><Icon name="repeat" size={13} />Fonte de captação (Genions)</span>
            <span style={{ fontSize: 11, color: "var(--text-subtle)", paddingLeft: 21 }}>CSV padrão · resumo automático</span>
          </button>
          <button className="vc-menuitem" style={{ alignItems: "flex-start", flexDirection: "column", gap: 2 }} onClick={() => { setOpen(false); onImportMap(); }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}><Icon name="braces" size={13} />Planilha com mapeamento</span>
            <span style={{ fontSize: 11, color: "var(--text-subtle)", paddingLeft: 21 }}>Qualquer CSV · mapeie as colunas</span>
          </button>
        </div>
      </VgPopover>
      <button className="vc-solidbtn" style={{ height: 34 }} onClick={onNew}><Icon name="userPlus" size={14} />Novo lead</button>
    </>
  );
}

// ---------- container ----------
export function CmLeads({ dataset, scores, hoje, injectFilter, lastImport, podeExcluir = false, onChanged, onNew, onConvert, onLose, onEdit, onMerge, onImport, onImportMap }: {
  dataset: CmDataset;
  scores: Map<number, CmLeadScore>;
  hoje: string;
  injectFilter: LeadInject | null;
  lastImport: LastImport | null;
  /** Sócio/admin: libera a exclusão DEFINITIVA (linha e lote). */
  podeExcluir?: boolean;
  /** Revalida o dataset compartilhado — as outras abas (Visão/Funil/Campanhas)
   *  leem `dataset`, não as linhas otimistas desta grade. */
  onChanged?: () => void;
  onNew: () => void;
  onConvert: (l: CmDatasetLead) => void;
  onLose: (l: CmDatasetLead) => void;
  onEdit: (l: CmDatasetLead) => void;
  onMerge: (l: CmDatasetLead) => void;
  onImport: () => void;
  onImportMap: () => void;
}) {
  const saved = useViewGridStore("oportunidades");
  const storedStages = usePipelineStore((s) => s.stages);
  const storedAreas = useAreasStore((s) => s.areas);
  const areaOpts = useMemo(() => toAreaOptions(storedAreas), [storedAreas]);

  const optimistic = useOptimisticRows<CmDatasetLead>({
    initialRows: dataset.leads,
    getId: useCallback((l: CmDatasetLead) => l.id, []),
    patchUrl: (id) => `/api/comercial/leads/${id}`,
    bulkUrl: "/api/comercial/leads/lote",
  });
  const { applyLocal } = optimistic;
  const moveEtapa = useCallback((id: number, etapa: string) => {
    applyLocal(id, { etapa } as Partial<CmDatasetLead>);
    void apiSend(`/api/comercial/leads/${id}/etapa`, "POST", { etapa }).catch(() => toast("Erro ao mover etapa", { kind: "error" }));
  }, [applyLocal]);

  // exclusão definitiva: a confirmação guarda os leads-alvo (linha OU seleção)
  const [aExcluir, setAExcluir] = useState<CmDatasetLead[] | null>(null);
  const { bulkDelete } = optimistic;
  const confirmarExclusao = useCallback(() => {
    const alvos = aExcluir ?? [];
    setAExcluir(null);
    if (!alvos.length) return;
    void bulkDelete(alvos.map((l) => l.id)).then((ok) => {
      if (!ok) return;
      toast(alvos.length === 1 ? "Oportunidade excluída" : `${alvos.length} oportunidades excluídas`);
      onChanged?.();
    });
  }, [aExcluir, bulkDelete, onChanged]);

  const campMap = useMemo(() => new Map(dataset.campaigns.map((c) => [c.id, c.nome])), [dataset.campaigns]);

  // lista de etapas (abertas + terminais) — dirige o kanban e o enum de etapa
  const openStages = useMemo(() => {
    const base = storedStages.length ? toStageOptions(storedStages)
      : [{ key: "novo", nome: "Novo", cor: "#7C8AA5" }, { key: "contato", nome: "Contato", cor: "#4A78C0" }, { key: "qualificado", nome: "Qualificado", cor: "#C0A147" }, { key: "proposta", nome: "Proposta", cor: "#9A6FB0" }];
    return base.map((s) => ({ key: s.key, nome: s.nome, cor: (s as { cor?: string | null }).cor ?? "#7C8AA5" }));
  }, [storedStages]);
  const stageList: StageMeta[] = useMemo(() => {
    const ganhoLabel = resolveEtapaLabel(storedStages, "ganho") || "Ganho";
    const perdidoLabel = resolveEtapaLabel(storedStages, "perdido") || "Perdido";
    return [
      ...openStages.map((s, i) => ({ code: s.key, label: s.nome, color: s.cor, i })),
      { code: "ganho", label: ganhoLabel, color: "#2E9E5B", i: openStages.length },
      { code: "perdido", label: perdidoLabel, color: "var(--crit)", i: openStages.length + 1 },
    ];
  }, [openStages, storedStages]);

  // schema (colunas + enums + pessoas)
  const schema: VgSchema = useMemo(() => {
    const people: VgPerson[] = dataset.usuarios.map((u) => ({ id: String(u.id), nome: u.nome, ini: initials(u.nome), cor: personColor(u.id) }));
    const enums: VgEnumRegistry = {
      origem: Object.fromEntries((Object.keys(ORIGEM_LABEL) as (keyof typeof ORIGEM_LABEL)[]).map((code) => [ORIGEM_LABEL[code], { c: ORIGEM_COLOR[code] ?? "var(--text-muted)", icon: ORIGEM_ICON[code] }])),
      etapa: Object.fromEntries(stageList.map((s) => [s.label, { c: s.color, i: s.i }])),
      area: Object.fromEntries(areaOpts.map((a) => [a.label, { c: resolveAreaColor(storedAreas, a.id) ?? "var(--text-muted)" }])),
      temperatura: Object.fromEntries(CX_TEMPERATURAS.map((t) => [t.label, { c: t.color, icon: TEMP_ICON[t.key] }])),
      qualState: QUAL_ENUM,
      cliqueId: { Sim: { c: H(150) }, Não: { c: "var(--text-subtle)" } },
    };
    const enumOrder: VgEnumOrder = {
      etapa: stageList.map((s) => s.label),
      temperatura: CX_TEMPERATURAS.map((t) => t.label),
      qualState: ["A", "B", "C", "D"],
      origem: Object.values(ORIGEM_LABEL),
      area: areaOpts.map((a) => a.label),
      cliqueId: ["Sim", "Não"],
    };
    const cols = LEADS_COLS.map((c) => c.key === "campanha" ? { ...c, enumList: dataset.campaigns.map((x) => x.nome) } : c);
    return {
      id: "leads", label: "Leads / Oportunidades", primaryLabel: "Lead", icon: "funnel",
      cols, enums, enumOrder, people, peopleMap: Object.fromEntries(people.map((p) => [p.id, p])), today: hoje,
    };
  }, [dataset.usuarios, dataset.campaigns, stageList, areaOpts, storedAreas, hoje]);

  // achata os leads em linhas de visão (labels p/ enums, reais p/ money, id p/ pessoa)
  const rows: VgRow[] = useMemo(() => optimistic.rows.map((l) => ({
    id: l.id,
    nome: l.nome,
    contato: l.contato ?? "",
    cliente: l.cliente ?? "",
    origem: ORIGEM_LABEL[l.origem as keyof typeof ORIGEM_LABEL] ?? l.origem ?? "",
    campanha: l.campanhaId != null ? (campMap.get(l.campanhaId) ?? "") : "",
    etapa: resolveEtapaLabel(storedStages, l.etapa),
    area: l.area ? resolveAreaLabel(storedAreas, l.area) : "",
    responsavel: l.responsavelUserId != null ? String(l.responsavelUserId) : "",
    temperatura: l.temperatura ? (CX_TEMP_MAP[l.temperatura]?.label ?? "") : "",
    qualState: scores.get(l.id)?.estado ?? "",
    fit: scores.get(l.id)?.fit ?? 0,
    engajamento: scores.get(l.id)?.eng ?? 0,
    valorEstimado: (l.valorEstimadoCents || 0) / 100,
    valorContratado: l.valorContratadoCents == null ? null : l.valorContratadoCents / 100,
    dataEntrada: l.dataEntrada ?? null,
    proximaAcao: l.proximaAcaoEm ?? null,
    dataConv: l.dataConv ?? null,
    palavraChave: l.utmTerm ?? "",
    cliqueId: l.temClique ? "Sim" : "Não",
  })), [optimistic.rows, campMap, storedStages, storedAreas, scores]);

  const leadById = useMemo(() => new Map(optimistic.rows.map((l) => [l.id, l])), [optimistic.rows]);
  const seedViews = useMemo(() => leadSeedViews(), []);

  // ações de linha / lote
  const onRowClick = useCallback((r: VgRow) => { const l = leadById.get(Number(r.id)); if (l) onEdit(l); }, [leadById, onEdit]);
  const reopen = useCallback((id: number) => moveEtapa(id, openStages[0]?.key ?? "contato"), [moveEtapa, openStages]);
  const pedirExclusao = useCallback((l: CmDatasetLead) => setAExcluir([l]), []);
  const rowActions = useCallback((r: VgRow) => {
    const l = leadById.get(Number(r.id));
    if (!l) return null;
    return <LeadRowMenu lead={l} onEdit={onEdit} onConvert={onConvert} onMerge={onMerge} onLose={onLose} onReopen={reopen} onDelete={podeExcluir ? pedirExclusao : undefined} />;
  }, [leadById, onEdit, onConvert, onMerge, onLose, reopen, podeExcluir, pedirExclusao]);

  // lote: a barra de seleção só oferece "Excluir" para quem pode
  const onBulkDelete = useCallback((ids: (string | number)[]) => {
    const alvos = ids.map((id) => leadById.get(Number(id))).filter((l): l is CmDatasetLead => !!l);
    if (alvos.length) setAExcluir(alvos);
  }, [leadById]);
  const bulkFields: VgBulkField[] = useMemo(() => [
    { field: "etapa", label: "Etapa", icon: "circleDot", options: openStages.map((s) => ({ value: s.key, label: s.nome, color: s.cor })) },
    { field: "responsavelUserId", label: "Responsável", icon: "user", options: [...dataset.usuarios.map((u) => ({ value: String(u.id), label: u.nome, person: String(u.id) })), { value: null, label: "Sem responsável" }] },
    { field: "temperatura", label: "Temperatura", icon: "flame", options: CX_TEMPERATURAS.map((t) => ({ value: t.key, label: t.label, color: t.color })) },
    ...(areaOpts.length ? [{ field: "area", label: "Área", icon: "scale" as VgIconName, options: areaOpts.map((a) => ({ value: a.id, label: a.label })) }] : []),
  ], [openStages, dataset.usuarios, areaOpts]);
  const onBulkApply = useCallback((ids: (string | number)[], field: string, value: string | null) => {
    const v: unknown = field === "responsavelUserId" ? (value == null ? null : Number(value)) : value;
    void optimistic.bulkApply(ids as number[], field, v);
  }, [optimistic]);

  // injeção de filtro (navegação cruzada de outras abas)
  const inject: { nonce: number; filters: VgGroup } | null = useMemo(() => {
    if (!injectFilter) return null;
    const children: VgGroup["children"] = [];
    if (injectFilter.campId != null) children.push({ type: "rule", id: "inj-c", col: "campanha", op: "in", value: "", value2: "", values: [campMap.get(injectFilter.campId) ?? ""] });
    if (injectFilter.etapa && injectFilter.etapa !== "todas") children.push({ type: "rule", id: "inj-e", col: "etapa", op: "in", value: "", value2: "", values: [resolveEtapaLabel(storedStages, injectFilter.etapa)] });
    if (injectFilter.origem) children.push({ type: "rule", id: "inj-o", col: "origem", op: "in", value: "", value2: "", values: [ORIGEM_LABEL[injectFilter.origem as keyof typeof ORIGEM_LABEL] ?? injectFilter.origem] });
    return { nonce: injectFilter.nonce, filters: { type: "group", id: "root", combinator: "E", children } };
  }, [injectFilter, campMap, storedStages]);

  const kanbanRender = useCallback((r: VgRow[]) => (
    <VgLeadsKanban rows={r} schema={schema} stageList={stageList} leadById={leadById}
      onMove={moveEtapa} onConvert={onConvert} onLose={onLose} onEdit={onEdit} />
  ), [schema, stageList, leadById, moveEtapa, onConvert, onLose, onEdit]);

  const toolbarExtra = <LeadsToolbar onImport={onImport} onImportMap={onImportMap} onNew={onNew} />;

  if (!saved.ready) return <div className="vc-root" style={{ padding: 40 }}><div className="skeleton" style={{ height: 32, width: 260, borderRadius: 8 }} /></div>;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} className="vg-host">
      {lastImport && (
        <div style={{ padding: "10px 24px 0", display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
          <Icon name="clock" size={13} style={{ color: "var(--text-subtle)" }} />
          Última importação · {lastImport.fonte} · {cmDate(lastImport.data)} · <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.novos}</strong> novos, <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.atualizados}</strong> atualizados{lastImport.campanhas ? <>, <strong style={{ color: "var(--text)", fontWeight: 500 }}>{lastImport.campanhas}</strong> campanhas</> : null}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ViewGrid
          schema={schema}
          rows={rows}
          searchKeys={["nome", "contato", "cliente"]}
          initialStore={saved.initial}
          seedViews={seedViews}
          onStoreChange={(s: VgGridStore) => saved.onChange(s)}
          onRowClick={onRowClick}
          rowActions={rowActions}
          selectable
          bulkFields={bulkFields}
          onBulkApply={onBulkApply}
          onBulkDelete={podeExcluir ? onBulkDelete : undefined}
          toolbarExtra={toolbarExtra}
          csvName={() => `lexia-leads-${hoje}.csv`}
          kanbanRender={kanbanRender}
          inject={inject}
        />
      </div>
      {aExcluir && <CmExcluirLeadsModal leads={aExcluir} onClose={() => setAExcluir(null)} onConfirm={confirmarExclusao} />}
    </div>
  );
}
