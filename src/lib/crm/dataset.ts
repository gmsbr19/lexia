// CRM workspace dataset — one server fetch of the list data the workspace needs.
// Detail panes/modals (cliente, caso, contrato, agenda) fetch on demand via the
// [id] routes. SERVER ONLY (composes the finance queries + the session role).
import { requireUser, type Role } from "@/lib/auth/session"
import {
  getCasoOptions,
  getCasos,
  getClienteOptions,
  getClientes,
  getContasOptions,
  getContratos,
  getSocioContas,
} from "@/lib/finance/queries"
import type { CasoRow, ContaOption, ContratoRow, IdNome, SocioConta } from "@/lib/finance/types"
import type { ClienteRow } from "@/lib/finance/types"
import { getUsuariosAtivos } from "@/lib/users/queries"
import { userIdPorEmail } from "@/lib/notificacoes/recipients"

export interface CrmDataset {
  clientes: ClienteRow[]
  casos: CasoRow[]
  contratos: ContratoRow[]
  socios: SocioConta[]
  clienteOptions: IdNome[]
  casoOptions: IdNome[]
  contaOptions: ContaOption[]
  usuarios: IdNome[] // usuários ativos — responsável do caso (e demais pickers de pessoa)
  role: Role
  userId: number | null // quem está vendo (autor das notas que pode excluir)
  userName: string
  userEmail: string
}

export async function getCrmDataset(): Promise<CrmDataset> {
  const [user, clientes, casos, contratos, socios, clienteOptions, casoOptions, contaOptions, usuarios] = await Promise.all([
    requireUser(),
    getClientes(),
    getCasos(),
    getContratos(),
    getSocioContas(),
    getClienteOptions(),
    getCasoOptions(),
    getContasOptions(),
    getUsuariosAtivos(),
  ])
  const userId = await userIdPorEmail(user.email)
  return {
    clientes,
    casos,
    contratos,
    socios,
    clienteOptions,
    casoOptions,
    contaOptions,
    usuarios: usuarios.map((u) => ({ id: u.id, nome: u.nome })),
    role: (user.role as Role) ?? "socio",
    userId,
    userName: user.nome,
    userEmail: user.email,
  }
}
