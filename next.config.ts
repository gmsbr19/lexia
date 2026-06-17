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
	serverExternalPackages: ["puppeteer", "nodemailer"],
	async headers() {
		return [{ source: "/(.*)", headers: securityHeaders }];
	},
};

export default withVanillaExtract(nextConfig);
