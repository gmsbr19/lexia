-- Convite de acesso: token de uso único (hash sha256) para o usuário definir a
-- própria senha. User.passwordHash vira nullable (o convidado nasce sem senha
-- e só consegue logar depois de definir uma pelo link de acesso).
-- Hand-authored so `prisma migrate dev` (db:migrate) applies non-interactively.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Rebuild User to make passwordHash nullable (SQLite can't ALTER COLUMN).
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'socio',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "notifPrefs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("id", "email", "nome", "passwordHash", "role", "ativo", "notifPrefs", "createdAt", "updatedAt") SELECT "id", "email", "nome", "passwordHash", "role", "ativo", "notifPrefs", "createdAt", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "ConviteAcesso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    "usadoEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConviteAcesso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteAcesso_tokenHash_key" ON "ConviteAcesso"("tokenHash");
CREATE INDEX "ConviteAcesso_userId_idx" ON "ConviteAcesso"("userId");
