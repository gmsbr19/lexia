"use client";

// Wiring por usuário do store de visões de um ViewGrid ("Controles de Visão")
// — GET no mount (gate de render via `ready`) + PATCH debounced (600ms) do
// OBJETO COMPLETO (convenção do servidor: full-object replace), p/ editar as
// visões de um grid nunca apagar as do outro gridId no blob compartilhado.
import { useEffect, useRef, useState } from "react";
import { apiSend } from "./api";
import type { CrmViewPrefs, GridId } from "@/lib/crm/view-prefs-core";
import type { VgGridStore } from "@/components/ui/viewgrid/vg-types";

export interface ViewGridSaved {
  initial: VgGridStore | null;
  onChange: (store: VgGridStore) => void;
  ready: boolean;
}

// cache em nível de processo — o GET gateia o render, então cachear torna a
// revisita de aba instantânea (sem flash de skeleton).
let prefsCache: CrmViewPrefs | null = null;

export function useViewGridStore(gridId: GridId): ViewGridSaved {
  const [initial, setInitial] = useState<VgGridStore | null>(() => prefsCache?.[gridId] ?? null);
  const [ready, setReady] = useState(prefsCache !== null);
  const full = useRef<CrmViewPrefs>(prefsCache ?? {});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    apiSend<CrmViewPrefs>("/api/crm/view-prefs", "GET")
      .then((prefs) => {
        if (!alive) return;
        prefsCache = prefs ?? {};
        full.current = prefsCache;
        setInitial(prefsCache[gridId] ?? null);
        setReady(true);
      })
      .catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [gridId]);

  const onChange = (store: VgGridStore) => {
    full.current = { ...full.current, [gridId]: store };
    prefsCache = full.current;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void apiSend("/api/crm/view-prefs", "PATCH", full.current).catch(() => {});
    }, 600);
  };

  return { initial, onChange, ready };
}
