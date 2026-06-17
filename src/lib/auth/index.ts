// Auth.js (NextAuth v5) configuration — credentials-only, per-user accounts.
// Sessions are stateless JWTs (httpOnly cookie); users live in the Prisma
// `User` table and are created via `scripts/create-user.ts` (no public signup).
// SERVER ONLY (the proxy uses the lean `./config` instead).
import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { authConfig } from "./config"
import "@/lib/env"

declare module "next-auth" {
  interface User {
    role?: string
  }
  interface Session {
    user: { role?: string } & DefaultSession["user"]
  }
}

const credentialsSchema = z.object({
  email: z.string().min(1),
  senha: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const email = parsed.data.email.trim().toLowerCase()
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.ativo) return null
        // Convidado que ainda não definiu a senha (passwordHash null) não loga.
        if (!user.passwordHash) return null

        const ok = await bcrypt.compare(parsed.data.senha, user.passwordHash)
        if (!ok) return null

        return { id: String(user.id), email: user.email, name: user.nome, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role ?? "socio"
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.role = typeof token.role === "string" ? token.role : "socio"
      return session
    },
  },
})
