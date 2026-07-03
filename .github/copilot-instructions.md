# Dadasstore Copilot Instructions

## What this project is
A learner-friendly TypeScript backend for Dada's digital products store. The backend is small, educational, and designed to teach Express API basics.

## How to run the backend
- `cd backend`
- `npm install`
- `npm run dev`

## What code agents should know
- Focus on `backend/src/index.ts` first.
- Keep code simple and commented for new learners.
- Prefer small incremental changes over large refactors.
- Use existing docs in `docs/LEARNING_GUIDE.md` and `docs/CONCEPTS.md` instead of duplicating explanations.

## Important areas
- `backend/package.json` — scripts and dependencies
- `backend/src/index.ts` — main server logic and endpoint patterns
- `README.md` — project overview and quick start

## When editing
- Preserve the teaching voice and examples.
- Use the `express`, `cors`, and `dotenv` patterns already present in the backend.
- Add endpoints under `/api/*` and keep request/response shapes straightforward.
