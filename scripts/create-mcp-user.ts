/**
 * Create/refresh the MCP service user (the identity every MCP action runs as).
 *
 *   npm run mcp:user
 *
 * Upserts LEXIA_MCP_USER (default mcp@lexia.local) with role `admin` and a NULL
 * passwordHash — the login `authorize` rejects null-hash accounts, so this user
 * can never sign in through the UI. Idempotent; reactivates a deactivated account.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.LEXIA_MCP_USER || "mcp@lexia.local").trim().toLowerCase()
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "admin", ativo: true, passwordHash: null },
    create: { email, nome: "Servidor MCP", passwordHash: null, role: "admin" },
  })
  console.log(`✔ usuário de serviço ${user.email} (#${user.id}, role ${user.role}, sem senha)`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
