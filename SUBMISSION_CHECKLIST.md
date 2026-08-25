# Final Submission Checklist

## Completed

- [x] React frontend with responsive parking dashboard
- [x] Node.js and Express REST API
- [x] PostgreSQL schema, seed data, transactions, indexes, and row-level locking
- [x] Fixed capacity: 5 bikes, 5 cars, 2 trucks
- [x] Parking, ticket generation, exit, fare calculation, slot release, active list, and history
- [x] Duplicate active vehicle protection
- [x] JWT authentication with bcrypt password hashing
- [x] Redis availability cache with invalidation after parking and exit
- [x] MongoDB activity and audit logging
- [x] Validation, centralized error responses, Helmet, CORS, and rate limiting
- [x] Paginated active and history endpoints
- [x] API integration tests and fare tests
- [x] PostgreSQL concurrency test with two simultaneous requests
- [x] Docker Compose configuration for PostgreSQL, MongoDB, and Redis
- [x] README setup and operation instructions
- [x] DESIGN.md architecture and implementation document
- [x] Root ignore rules for local environment files, dependencies, and build output

## Manually complete

- [ ] Export DESIGN.md to a professional Word document or PDF.
- [ ] Review the exported document visually and ensure the Mermaid diagram renders or replace it with a screenshot.
- [ ] Record a 5-10 minute walkthrough with voice.
- [ ] Show login, parking, ticket result, active vehicles, exit, fare, history, and slot release in the video.
- [ ] Demonstrate the concurrency test and explain `FOR UPDATE SKIP LOCKED`.
- [ ] Mention one limitation or trade-off in the video.
- [ ] Create a GitHub repository or ZIP archive.
- [ ] Remove any local `.env` files from the archive before submission.
- [ ] Confirm no real passwords, API keys, tokens, or private connection strings are present.
- [ ] Add the GitHub URL or final ZIP location to the submission form.

## Files to submit

- [ ] `client/src/`
- [ ] `client/package.json`
- [ ] `client/package-lock.json`
- [ ] `client/vite.config.js`
- [ ] `server/src/`
- [ ] `server/tests/`
- [ ] `server/package.json`
- [ ] `server/package-lock.json`
- [ ] `server/.env.example`
- [ ] `database/schema.sql`
- [ ] `database/seed.sql`
- [ ] `database/migration-auth.sql`
- [ ] `docker-compose.yml`
- [ ] `README.md`
- [ ] `DESIGN.md`
- [ ] `SUBMISSION_CHECKLIST.md`
- [ ] `.gitignore`
- [ ] Exported `DESIGN.docx` or `DESIGN.pdf`

## Do not submit

- `server/.env`
- Any `.env` file containing real values
- `node_modules/`
- `client/dist/`
- Personal screenshots containing private information
- Database dumps containing real user or vehicle data
- JWT tokens, API keys, private credentials, or production connection strings

## Verification commands

From the project root:

```powershell
# Start services
docker compose up -d

# Start API
npm --prefix server run dev

# Start frontend in a second terminal
npm --prefix client run dev

# Run all backend tests, including concurrency
$env:RUN_INTEGRATION='1'
npm --prefix server test

# Verify frontend
npm --prefix client run build
npm --prefix client run lint
```

## Convert DESIGN.md to Word/PDF

Option 1, using Microsoft Word:

1. Open `DESIGN.md` in VS Code.
2. Select all content and copy it.
3. Open Word and paste using “Keep Source Formatting” or “Merge Formatting”.
4. Apply Heading 1 and Heading 2 styles to headings if needed.
5. Replace the Mermaid code block with a rendered architecture screenshot or diagram.
6. Save as `DESIGN.docx`.
7. Use **File > Export > Create PDF/XPS** to also create `DESIGN.pdf`.

Option 2, using Pandoc if installed:

```powershell
pandoc DESIGN.md -o DESIGN.docx
pandoc DESIGN.md -o DESIGN.pdf --pdf-engine=wkhtmltopdf
```

If Pandoc or a PDF engine is unavailable, use Microsoft Word’s Save As or Export workflow.
