// Zod schemas for the users mutation payloads, enforced at the route boundary.
// Senha/role semantics (min length, last-admin invariant, senhaAtual check)
// live in the mutation layer.
import { z } from "zod"

// Criação por convite: sem senha — o convidado define a própria pelo link.
export const userCreateSchema = z.object({
  email: z.string().min(3).max(200),
  nome: z.string().min(1).max(200),
  role: z.string().max(20).optional(),
})

// Endpoint público /api/convite/definir-senha (convidado, sem sessão). A regra
// de comprimento mínimo da senha vive na mutation (hashSenha → validSenha).
export const definirSenhaSchema = z.object({
  token: z.string().min(1).max(500),
  senha: z.string().min(1).max(200),
  nome: z.string().min(1).max(200).optional(),
})

export const userPatchSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  role: z.string().max(20).optional(),
  ativo: z.boolean().optional(),
  senha: z.string().min(1).max(200).optional(),
})

export const profilePatchSchema = z.object({
  nome: z.string().min(1).max(200).optional(),
  senha: z.string().min(1).max(200).optional(),
  senhaAtual: z.string().max(200).optional(),
})
