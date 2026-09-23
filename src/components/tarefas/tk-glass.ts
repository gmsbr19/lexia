// Tarefas — o vidro do APP (styles/glass.css.ts), não uma receita própria:
// janelas usam `lexGlass`, menus/aviso usam `lexGlassStrong` (mais opaco sobre
// conteúdo vivo), cada um com a mesma elevação que os modais/menus do CRM.
import { glassElevation } from "@/styles/glass"
import { lexGlass, lexGlassStrong } from "@/styles/glass.css"

/** Janela (detalhe, nova tarefa, projeto, modelo, assistente, confirmação). */
export const TK_JANELA = `${lexGlass} tk-panel`
export const ELEVACAO_JANELA = glassElevation("0 40px 100px rgba(2,13,37,0.42), 0 12px 32px rgba(2,13,37,0.24)")

/** Menu / popover. */
export const TK_MENU = `${lexGlassStrong} tk-pop`
export const ELEVACAO_MENU = glassElevation("0 12px 28px rgba(2,13,37,0.16)")

/** Aviso (toast) com "Desfazer". */
export const TK_AVISO = `${lexGlassStrong} tk-toast`
export const ELEVACAO_AVISO = glassElevation("0 12px 32px rgba(2,13,37,0.18)")
