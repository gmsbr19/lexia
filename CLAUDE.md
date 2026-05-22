# CLAUDE.md — Lexia (concise, token-efficient)

1) Purpose
Lexia is a Next.js app for law-office document generation. Current feature: server-side DOCX/PDF for "Contrato de Honorarios".

2) Language policy
- Use English for tool prompts, reasoning, and internal comments.
- Produce legal/user-facing text in PT-BR unless user requests another language.

3) Current state (short)
- Content: AST builder at `src/lib/documents/generators/contrato-honorarios/content.ts`.
- Renderers: `docx.ts`, `html.ts`, `pdf.ts`.
- API: `POST /api/documents/generate` (docx/pdf binaries).
- UI: manual preview + download buttons.
- Open issue: PDF letterhead doesn't cover sheet margins.

4) Current focus (priority)
1. Refactor documents page code in order to apply best code practices, componentize and make code maintenance easier.
2. Fix PDF letterhead to cover full A4 (no DOCX regression).
3. Add more document types reusing the same pipeline.

5) Mandatory rules
- Confidence: do not implement unless >=95% confident; if not, ask targeted questions.
- Do not invent legal requirements or clauses.
- Follow `src/styles/tokens.css.ts` and `src/styles/theme.css.ts` for visuals.

6) Token-economy rules
- Keep messages short and actionable (1–3 sentences where possible).
- Read files in focused batches; prefer diffs over full-file retransmission.
- Refer to existing code instead of copying large blocks.
- Ask a single clarifying question when unclear.

7) UI & styling
- Use RadixUI components and vanilla-extract for styles.
- No inline/ad-hoc CSS; co-locate styles with components.

8) Architecture
- Respect folders: `app/`, `components/`, `lib/`, `styles/`.
- Keep content generation, renderers, and UI separate.
- Prefer small, testable functions and clear interfaces.

9) Next.js caution
- This Next version may differ from defaults; consult `node_modules/next/dist/docs/` before framework-level changes.

10) End-of-session checklist (update CLAUDE.md)
- One-line State: what now works (2–3 items).
- One-line Focus: next top 1–3 priorities.
- Changes summary: files changed + intent (one line each).
- Open questions: list required clarifications.

11) Always update this file at session end so future sessions start with current context.
