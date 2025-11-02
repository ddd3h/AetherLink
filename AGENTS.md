# Repository Guidelines

## Project Structure & Module Organization
- Source code: `src/` (e.g., `src/components/`, `src/lib/`).
- Tests: `tests/` or colocated `src/**/__tests__/`.
- Static assets: `public/` or `assets/`.
- Tooling and scripts: `scripts/`, configuration in dotfiles (e.g., `.eslintrc`, `pyproject.toml`).
- Create missing folders as needed; keep module boundaries small and cohesive.

## Build, Test, and Development Commands
- Discover commands from project files first: check `Makefile`, `package.json`, or `pyproject.toml`.
- Common patterns (use what exists in this repo):
  - Dev server: `npm run dev` or `make dev`.
  - Build: `npm run build` or `make build`.
  - Test: `npm test`, `pytest -q`, or `make test`.
  - Lint/format: `npm run lint && npm run format` or `ruff check && black .`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces (JS/TS), 4 spaces (Python).
- Filenames: `kebab-case` for assets, `camelCase` for utilities, `PascalCase` for components/classes.
- Keep functions small; prefer pure helpers in `src/lib/`.
- Use a formatter and linter. Defaults if not configured:
  - JS/TS: Prettier + ESLint (Airbnb or Recommended rules).
  - Python: Black + Ruff.

## Testing Guidelines
- Frameworks: Jest/Vitest for JS/TS; Pytest for Python.
- Name tests `*.test.ts` / `*.spec.ts` or `test_*.py`.
- Aim for meaningful unit tests near code; integration tests under `tests/`.
- Run locally before pushing and keep coverage stable or improving.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits, e.g., `feat: add sidebar`, `fix: handle null state`.
- Scope small, messages imperative and specific. Reference issues like `#123`.
- PRs: clear description, screenshots/GIFs for UI, steps to verify, and check passing CI (build, lint, test).

## Security & Configuration
- Do not commit secrets. Use `.env` and add to `.gitignore`.
- Document required environment variables in `README` or `.env.example`.
- Pin tool versions (e.g., Node in `.nvmrc`, Python in `.python-version`).

## Agent-Specific Notes
- Keep patches focused; avoid unrelated refactors.
- Update or add commands/scripts minimally; prefer existing conventions.
- Before large changes, propose a brief plan and get feedback when unsure.
