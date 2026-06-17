// Lean Auth.js options shared between the full server config (`./index.ts`)
// and the request gate (`src/proxy.ts`). Deliberately contains NO providers and
// NO prisma/bcrypt imports: the proxy is bundled separately and only needs the
// AUTH_SECRET-signed JWT cookie to be verifiable.
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // The app runs behind a reverse proxy (Caddy) in production.
  trustHost: true,
  providers: [],
} satisfies NextAuthConfig
