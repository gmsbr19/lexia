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
  getHonorarios,
  getSocioContas,
} from "@/lib/finance/queries"
import type { CasoRow, ContaOption, HonorarioRow, IdNome, SocioConta } from "@/lib/finance/types"
import type { ClienteRow } from "@/lib/finance/types"

export interface CrmDataset {
  clientes: ClienteRow[]
  casos: CasoRow[]
  contratos: HonorarioRow[]
  socios: SocioConta[]
  clienteOptions: IdNome[]
  casoOptions: IdNome[]
  contaOptions: ContaOption[]
  role: Role
  userName: string
  userEmail: string
}

export async function getCrmDataset(): Promise<CrmDataset> {
  const [user, clientes, casos, contratos, socios, clienteOptions, casoOptions, contaOptions] = await Promise.all([
    requireUser(),
    getClientes(),
    getCasos(),
    getHonorarios(),
    getSocioContas(),
    getClienteOptions(),
    getCasoOptions(),
    getContasOptions(),
  ])
  return {
    clientes,
    casos,
    contratos,
    socios,
    clienteOptions,
    casoOptions,
    contaOptions,
    role: (user.role as Role) ?? "socio",
    userName: user.nome,
    userEmail: user.email,
  }
}
