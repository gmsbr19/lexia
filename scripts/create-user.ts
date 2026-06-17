/**
 * Create or update a login user (no public signup — this CLI is the only way).
 *
 *   npm run user:create -- <email> <nome> <senha> [admin|socio|advogado|estagiario|financeiro|staff]
 *
 * Idempotent: upserts by e-mail (re-running updates nome/senha/role and
 * reactivates a deactivated account).
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const ROLES = ["admin", "socio", "advogado", "estagiario", "financeiro", "staff"] as const

async function main() {
  const [emailRaw, nome, senha, role = "socio"] = process.argv.slice(2)

  if (!emailRaw || !nome || !senha) {
    console.error(`Uso: npm run user:create -- <email> <nome> <senha> [${ROLES.join("|")}]`)
    process.exit(1)
  }
  if (senha.length < 8) {
    console.error("Senha deve ter pelo menos 8 caracteres.")
    process.exit(1)
  }
  if (!(ROLES as readonly string[]).includes(role)) {
    console.error(`Role inválida: ${role} (use ${ROLES.join(", ")})`)
    process.exit(1)
  }

  const email = emailRaw.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(senha, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { nome, passwordHash, role, ativo: true },
    create: { email, nome, passwordHash, role },
  })
  console.log(`✔ usuário ${user.email} (#${user.id}, role ${user.role})`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
