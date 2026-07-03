# Dadasstore AI Agent Guide

## Purpose
This file helps AI coding agents understand the repository structure, the intended learning-oriented backend, and where to find the core commands and documentation.

## Project structure
- `backend/` – TypeScript Express backend API. Main entrypoint is `backend/src/index.ts`.
- `docs/` – Learning documentation for contributors and beginners.
- `README.md` – high-level project overview and quick-start instructions.

## Backend conventions
- The backend is simple, educational, and intentionally written with explanatory comments.
- Use `npm install` in `backend/` to install dependencies.
- Run locally with `npm run dev` from `backend/`.
- Build output is `backend/dist/index.js` via `npm run build`.
- The API serves JSON endpoints on `/api/*` and uses `express`, `cors`, and `dotenv`.

## Recommended agent behavior
- Preserve the learning-friendly style and comments when editing code.
- Prefer clear, beginner-friendly solutions over advanced patterns.
- Link to existing docs rather than duplicating them.
- For backend work, focus on `backend/src/index.ts` first.

## Important files
- `backend/package.json` – scripts and dependencies
- `backend/src/index.ts` – current backend implementation and endpoint examples
- `README.md` – project goals and quick start
- `docs/LEARNING_GUIDE.md` – learner onboarding guide
- `docs/CONCEPTS.md` – coding concepts explanation

## Notes for future customization
- If the repo expands with separate frontend/admin/mobile workspaces, add dedicated instructions or skills for those areas.
- Use `endpoint-helper.skill.md` for guided backend API endpoint changes.
