// Errors whose message is safe to show to the end user (PT-BR validation
// messages like "id inválido"). `runMutation` maps UserError → 400 + message;
// any other error is logged server-side and answered with a generic 500 so
// Prisma/stack details never reach the client.
export class UserError extends Error {}

// Raised when the caller is authenticated but lacks the role/permission for the
// action. `runMutation` maps it to 403. Lives here (not auth/session) so pure
// server modules can throw it without pulling next-auth into their import graph
// (e.g. the LexIA tool registry stays next-auth-free for tests).
export class ForbiddenError extends Error {}
