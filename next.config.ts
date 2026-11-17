import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";

const withVanillaExtract = createVanillaExtractPlugin({
	unstable_turbopack: {
		mode: "on",
	},
});

const securityHeaders = [
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "same-origin" },
	{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
	// Report-Only until a nonce strategy for Next's inline scripts is verified —
	// promote to Content-Security-Policy then (P2). HSTS lives in the Caddyfile.
	{
		key: "Content-Security-Policy-Report-Only",
		value: "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:",
	},
];

const nextConfig: NextConfig = {
	poweredByHeader: false,
	// `pg`: o bus do WhatsApp mantem uma conexao LISTEN no processo do servidor
	// (src/lib/whatsapp/bus.ts). O pacote carrega `pg-native` por require
	// opcional — empacotar isso quebra o build, entao fica externo, como os
	// demais pacotes so-de-servidor.
	serverExternalPackages: ["puppeteer", "nodemailer", "pg"],
	// Os documentos de metadados do OAuth tem de ficar em /.well-known/… (o
	// cliente MCP so procura la). Pasta com ponto no app router e fragil, entao
	// servimos por rewrite a partir de rotas normais em /api/oauth/metadata/*.
	// As DUAS formas do RFC 9728 sao atendidas: a path-aware (…/api/mcp, que o
	// cliente tenta primeiro) e a da raiz.
	async rewrites() {
		return [
			{ source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/metadata/authorization-server" },
			{ source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/oauth/metadata/authorization-server" },
			{ source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/metadata/protected-resource" },
			{ source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth/metadata/protected-resource" },
		];
	},
	async headers() {
		return [{ source: "/(.*)", headers: securityHeaders }];
	},
};

export default withVanillaExtract(nextConfig);
