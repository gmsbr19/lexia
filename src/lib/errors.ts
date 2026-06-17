// Errors whose message is safe to show to the end user (PT-BR validation
// messages like "id inválido"). `runMutation` maps UserError → 400 + message;
// any other error is logged server-side and answered with a generic 500 so
// Prisma/stack details never reach the client.
export class UserError extends Error {}
