# Repository Guidelines

## Project Structure & Module Organization
- `app/[[...slug]]`: App Router entry point handling workspace, folder, and request views.
- `app/api/*`: Next.js server routes for workspaces, folders, requests, and encrypted environment storage.
- `components/workspace/*`: Client UI modules for the tree, builder, environment manager, and folder overview.
- `lib/models/*`: Mongoose schemas (Request, Folder, Workspace, WorkspaceEnvironment).
- `lib/security/encryption.ts`: AES-256-GCM helpers for secrets.
- `public/` and `app/globals.css`: Shared assets and global styling.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server with hot reload.
- `npm run lint`: Run TypeScript-aware linting; address all warnings before merging.
- `npm run build`: Create a production build; the CI/CD pipeline must pass this.

## Coding Style & Naming Conventions
- TypeScript + React (strict). Prefer functional components with explicit prop types.
- Use 2-space indentation; follow the ESLint + Prettier defaults configured in `eslint.config.mjs`.
- React component files live in `components/**` and are named `kebab-case.tsx`. Hooks live under `lib/**`.
- Always preserve ASCII unless the existing file already uses non‑ASCII characters.

## Testing Guidelines
- Automated tests are currently not defined; prioritize adding unit tests alongside new features (e.g., under `tests/` or colocated `*.test.ts`).
- When adding tests, script them via `npm run test` (create if missing) so future automation is consistent.

## Commit & Pull Request Guidelines
- Follow conventional, action-oriented commit messages (e.g., `feat(workspace): add folder overview panel`).
- Each PR should include: concise summary, linked issue (if any), screenshots or GIFs for UI changes, and manual test notes.
- Keep commits focused; split large features into logical commits for easier review.

## Security & Configuration Tips
- Required environment variables: `MONGODB_URI` and `ENCRYPTION_KEY` (32+ chars). Never hardcode secrets.
- Secrets are encrypted at rest; verify decryption via `/api/workspaces/:id/env`.
- When working locally, use Docker (`docker compose up mongodb mongo-express -d`) for MongoDB dependencies.
