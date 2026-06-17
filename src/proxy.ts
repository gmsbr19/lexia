// Request gate (Next 16 renamed middleware → proxy). Every page and API route
// requires a valid Auth.js session cookie: unauthenticated API calls get a 401
// JSON envelope, pages redirect to /login. Uses the lean auth config (no
// prisma/bcrypt) — JWT cookie verification only needs AUTH_SECRET.
import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { authConfig } from "@/lib/auth/config"

const { auth } = NextAuth(authConfig)

export const proxy = auth((req) => {
  const { nextUrl } = req
  const isApi = nextUrl.pathname.startsWith("/api")

  // Cheap CSRF belt: reject cross-origin non-GET API calls (Auth.js session
  // cookies are already httpOnly + SameSite=Lax; this covers the rest).
  if (isApi && req.method !== "GET") {
    const origin = req.headers.get("origin")
    if (origin) {
      let originHost: string | null = null
      try {
        originHost = new URL(origin).host
      } catch {
        /* malformed Origin → reject below */
      }
      if (!originHost || originHost !== nextUrl.host) {
        return NextResponse.json({ error: "Origem inválida" }, { status: 403 })
      }
    }
  }

  if (!req.auth) {
    if (isApi) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    const loginUrl = new URL("/login", nextUrl)
    if (nextUrl.pathname !== "/") loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  // Everything except: login page, the public access-link page + its endpoint
  // (convidado sem sessão), Auth.js own endpoints, health check (uptime pinger
  // has no cookie), Next internals and static assets.
  matcher: [
    "/((?!login|definir-senha|api/auth|api/convite|api/health|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
}
