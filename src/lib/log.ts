// Structured logging → stdout (journald owns retention in production:
// `journalctl -u lexia`). Pretty-printing is deliberately omitted — dev output
// is still readable JSON lines. SERVER ONLY.
import pino from "pino"

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined, // drop pid/hostname noise — systemd adds context already
})
