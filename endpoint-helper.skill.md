# Backend Endpoint Helper Skill

## Purpose
Help AI agents add, update, and document new Express API endpoints in `backend/src/index.ts` for Dada's learning-focused backend.

## When to use
- Adding new `/api/*` routes
- Extending simple CRUD behavior for products
- Keeping request and response shapes beginner-friendly
- Preserving the teaching voice in comments and examples

## Guidance for agents
- Add endpoints under `/api/*` only, unless the task explicitly requires a different path.
- Keep each endpoint simple and self-contained.
- Prefer in-file sample data arrays or functions over introducing models or databases.
- Use `express.json()` and `cors()` patterns already present in `backend/src/index.ts`.
- Add clear comments that explain the endpoint logic for learners.
- Do not introduce advanced patterns like middleware chains, ORM, or custom request validation unless explicitly asked.

## Example endpoint style
- `GET /api/products` returns a short list of products
- `GET /api/products/:id` returns a single product object or a 404-style response
- `POST /api/products` accepts JSON and returns the created product
- `PUT /api/products/:id` updates a product and returns the updated product
- `DELETE /api/products/:id` returns a success status

## Notes
- Link to `docs/LEARNING_GUIDE.md` and `docs/CONCEPTS.md` for broader learning context.
- Keep the code and comments easy to read for new learners.
