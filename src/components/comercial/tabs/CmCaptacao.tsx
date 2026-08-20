"use client";

// LexIA · Comercial — aba Captação: fila de eventos de conversão (Google Ads
// lê um feed CSV — GET /feeds/google-ads/*.csv — nada de push/API aqui) sobre
// o ViewGrid (gridId "conversoes"), os KPIs do cabeçalho (incluindo o
// "alarme de incêndio" do módulo: % de leads sem gclid) e um segundo modo,
// Reconciliação (por semana e por estágio). Config/landing pages ficam em
// Configurações → Captação (admin) — aqui é monitoramento + descartar/
// reativar em lote.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getCaptacaoKpis, listConversoesEventos, aplicarLoteConversoes, getReconciliacaoSemanal } from "../../crm/crm-api";
import type { CaptacaoKpis, EventoRow as ConversaoEventoRow } from "@/lib/captacao/fila";
import type { LinhaReconciliacao } from "@/lib/captacao/reconciliacao";
import { toast } from "@/lib/client/toast";
import { useViewGridStore } from "@/lib/client/useViewGridStore";
import {
  ViewGrid, makeDefaultState,
  type VgSchema, type VgColumn, type VgRow, type VgGridStore, type VgEnumRegistry, type VgEnumOrder, type VgBulkField,
} from "@/components/ui/viewgrid";
import { CmKpi, CmSegmented } from "../cm-kit";

const H = (h: number, l = 0.72, c = 0.12) => `oklch(${l} ${c} ${h})`;

const TIPO_LABEL: Record<string, string> = {
  formulario_enviado: "Formulário enviado",
  lead_qualificado: "Lead qualificado",
  reuniao_realizada: "Reunião realizada",
  contrato_assinado: "Contrato assinado",
};
const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", descartado: "Descartado" };
const STATUS_COLOR: Record<string, string> = { pendente: H(150), descartado: "var(--text-subtle)" };

const COLS: VgColumn[] = [
  { key: "lead", label: "Lead", type: "text", fixed: true, def: true, w: 200 },
  { key: "tipo", label: "Tipo", type: "enum", enum: "tipo", group: true, def: true, w: 160 },
  { key: "status", label: "Status", type: "enum", enum: "status", group: true, def: true, w: 110 },
  { key: "valor", label: "Valor", type: "money", def: true, w: 110, align: "right", agg: "sum" },
  { key: "temGclid", label: "gclid", type: "enum", enum: "temGclid", group: true, def: true, w: 90 },
  { key: "campanha", label: "Campanha", type: "enum", enumList: [], group: true, def: false, w: 160 },
  { key: "ocorreuEm", label: "Ocorreu em", type: "date", def: true, w: 120 },
  { key: "ajuste", label: "Ajuste", type: "enum", enum: "ajuste", group: true, def: false, w: 90 },
  { key: "motivoDescarte", label: "Motivo do descarte", type: "text", def: false, w: 220 },
];

function FilaView() {
  const [eventos, setEventos] = useState<ConversaoEventoRow[] | null>(null);
  const [kpis, setKpis] = useState<CaptacaoKpis | null>(null);
  const saved = useViewGridStore("conversoes");

  const load = useCallback(() => {
    Promise.all([listConversoesEventos(), getCaptacaoKpis()])
      .then(([e, k]) => { setEventos(e); setKpis(k); })
      .catch((err) => toast(err instanceof Error ? err.message : "Erro ao carregar", { kind: "error" }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows: VgRow[] = useMemo(
    () => (eventos ?? []).map((e) => ({
      id: e.id,
      lead: e.leadNome,
      tipo: TIPO_LABEL[e.tipo] ?? e.tipo,
      status: STATUS_LABEL[e.status] ?? e.status,
      valor: e.valorCents / 100,
      temGclid: e.temGclid ? "Sim" : "Não",
      campanha: e.campanhaNome ?? "—",
      ocorreuEm: e.ocorreuEm,
      ajuste: e.temAjuste ? "Sim" : "Não",
      motivoDescarte: e.motivoDescarte ?? "",
    })),
    [eventos],
  );

  const schema: VgSchema = useMemo(() => {
    const tiposPresentes = Array.from(new Set((eventos ?? []).map((e) => e.tipo)));
    const statusPresentes = Array.from(new Set((eventos ?? []).map((e) => e.status)));
    const campanhas = Array.from(new Set((eventos ?? []).map((e) => e.campanhaNome).filter((x): x is string => !!x)));
    const enums: VgEnumRegistry = {
      tipo: Object.fromEntries(tiposPresentes.map((t) => [TIPO_LABEL[t] ?? t, { c: H(200) }])),
      status: Object.fromEntries(statusPresentes.map((s) => [STATUS_LABEL[s] ?? s, { c: STATUS_COLOR[s] ?? "var(--text-muted)" }])),
      temGclid: { Sim: { c: H(150) }, Não: { c: H(25) } },
      ajuste: { Sim: { c: H(260) }, Não: { c: "var(--text-subtle)" } },
    };
    const enumOrder: VgEnumOrder = { status: ["Pendente", "Descartado"], temGclid: ["Sim", "Não"] };
    const cols = COLS.map((c) => (c.key === "campanha" ? { ...c, enumList: campanhas } : c));
    return { id: "conversoes", label: "Conversões", primaryLabel: "Evento", icon: "funnel", cols, enums, enumOrder, people: [], peopleMap: {}, today: new Date().toISOString().slice(0, 10) };
  }, [eventos]);

  const bulkFields: VgBulkField[] = useMemo(() => [
    { field: "acao", label: "Ação", icon: "refreshCw", options: [{ value: "descartar", label: "Descartar" }, { value: "reativar", label: "Reativar" }] },
  ], []);

  const onBulkApply = useCallback((ids: (string | number)[], field: string, value: string | null) => {
    if (field !== "acao" || (value !== "descartar" && value !== "reativar")) return;
    let motivo: string | undefined;
    if (value === "descartar") {
      motivo = window.prompt("Motivo do descarte:")?.trim();
      if (!motivo) return;
    }
    void aplicarLoteConversoes(ids as number[], value, motivo)
      .then(() => { toast(value === "descartar" ? "Eventos descartados" : "Eventos reativados"); load(); })
      .catch((e) => toast(e instanceof Error ? e.message : "Erro", { kind: "error" }));
  }, [load]);

  const kpiCards = kpis && (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "0 24px 16px", flexShrink: 0 }}>
      <CmKpi label="Pendentes" value={String(kpis.pendentes)} icon="clock" />
      <CmKpi label="No feed agora" value={String(kpis.noFeedAgora)} icon="checkCircle" tone="pos" />
      <CmKpi label="Descartados" value={String(kpis.descartados)} icon="alertCircle" />
      <CmKpi label="Sem gclid" value={`${kpis.semCliquePct}%`} icon="alertTriangle" tone={kpis.semCliquePct >= 30 ? "neg" : undefined} sub={`leads via LP nos últimos ${kpis.janelaDias}d`} />
    </div>
  );

  if (!saved.ready || !eventos) return <div className="vc-root" style={{ padding: 40 }}><div className="skeleton" style={{ height: 32, width: 260, borderRadius: 8 }} /></div>;

  return (
    <>
      {kpiCards}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ViewGrid
          schema={schema}
          rows={rows}
          searchKeys={["lead", "motivoDescarte"]}
          initialStore={saved.initial}
          seedViews={[{ id: "todos", name: "Todos", icon: "list", isDefault: true, state: makeDefaultState({ cols: COLS }) }]}
          onStoreChange={(s: VgGridStore) => saved.onChange(s)}
          selectable
          bulkFields={bulkFields}
          onBulkApply={onBulkApply}
          csvName={() => `lexia-conversoes-${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>
    </>
  );
}

function ReconciliacaoView() {
  const [linhas, setLinhas] = useState<LinhaReconciliacao[] | null>(null);

  useEffect(() => {
    getReconciliacaoSemanal()
      .then(setLinhas)
      .catch((e) => toast(e instanceof Error ? e.message : "Erro ao carregar", { kind: "error" }));
  }, []);

  if (!linhas) return <div style={{ padding: 24, fontSize: 12, color: "var(--text-subtle)" }}>Carregando…</div>;

  const semanas = Array.from(new Set(linhas.map((l) => l.semana)));

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 24px 24px" }}>
      {semanas.map((semana) => {
        const doGrupo = linhas.filter((l) => l.semana === semana);
        const leadsGravados = doGrupo[0]?.leadsGravados ?? 0;
        const postsFalhos = doGrupo[0]?.postsFalhos ?? 0;
        return (
          <div key={semana} className="card" style={{ marginBottom: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px", background: "var(--bg-sunken)", fontSize: 12.5 }}>
              <strong style={{ color: "var(--text)" }}>Semana de {semana}</strong>
              <span style={{ color: "var(--text-muted)" }}>Leads gravados: <strong style={{ color: "var(--text)" }}>{leadsGravados}</strong></span>
              <span style={{ color: postsFalhos > 0 ? "var(--crit)" : "var(--text-muted)" }}>POSTs que falharam: <strong>{postsFalhos}</strong></span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-subtle)", fontSize: 11 }}>
                  <th style={{ padding: "6px 14px" }}>Estágio</th>
                  <th style={{ padding: "6px 14px", textAlign: "right" }}>Disparados</th>
                  <th style={{ padding: "6px 14px", textAlign: "right" }}>No feed agora</th>
                  <th style={{ padding: "6px 14px", textAlign: "right" }}>Descartados</th>
                  <th style={{ padding: "6px 14px" }}>Motivos</th>
                </tr>
              </thead>
              <tbody>
                {doGrupo.map((l) => (
                  <tr key={l.tipo} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 14px", color: "var(--text)" }}>{TIPO_LABEL[l.tipo] ?? l.tipo}</td>
                    <td style={{ padding: "6px 14px", textAlign: "right" }}>{l.eventosDisparados}</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", color: "var(--ok)" }}>{l.noFeedAgora}</td>
                    <td style={{ padding: "6px 14px", textAlign: "right", color: l.descartados > 0 ? "var(--warn)" : undefined }}>{l.descartados}</td>
                    <td style={{ padding: "6px 14px", color: "var(--text-subtle)", fontSize: 11.5 }}>{l.motivosDescarte.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function CmCaptacao() {
  const [modo, setModo] = useState<"fila" | "reconciliacao">("fila");
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} className="vg-host">
      <div style={{ padding: "20px 24px 12px", flexShrink: 0 }}>
        <CmSegmented
          value={modo}
          onChange={(v) => setModo(v as "fila" | "reconciliacao")}
          options={[{ value: "fila", label: "Fila" }, { value: "reconciliacao", label: "Reconciliação" }]}
        />
      </div>
      {modo === "fila" ? <FilaView /> : <ReconciliacaoView />}
    </div>
  );
}
