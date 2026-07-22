// Política PURA do modo automático da LexIA (sem deps server-only → testável
// isolada). Usada pelo loop do agente para decidir quando uma mutação executa
// direto (auto) vs. pausa para confirmação humana.

/** Ações irreversíveis (excluir/anonimizar) — sempre confirmadas, mesmo em auto-mode. */
export function ehDestrutiva(name: string): boolean {
  return /^excluir_/.test(name) || /anonim/.test(name)
}

/**
 * A mutação `name` deve executar SEM cartão de confirmação? Só quando o auto está
 * ligado, fora do modo "plano" (que prometeu aprovação humana) e a ação NÃO é
 * destrutiva (excluir/anonimizar sempre pedem confirmação). Vale para TODAS as
 * mutações não destrutivas de uma mesma mensagem — várias criações em lote (um
 * projeto com N seções/tarefas) executam em sequência, sem pausar em cada uma.
 */
export function deveAutoExecutar(autoMode: boolean | undefined, mode: string | undefined, name: string): boolean {
  return !!autoMode && mode !== "plano" && !ehDestrutiva(name)
}
