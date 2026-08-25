# Parking Lot Management System

Full-stack parking management application using React, Express, PostgreSQL, MongoDB, and Redis.

## Architecture

- PostgreSQL stores slots and parking records and is the transactional source of truth.
- MongoDB stores activity and audit events.
- Redis caches availability counts with a short TTL. Cache values never authorize parking.
- React provides the responsive dashboard.
- JWT protects parking operations; passwords are stored as bcrypt hashes.

## Concurrency

Parking runs in one PostgreSQL transaction. The service selects an available slot with `SELECT ... FOR UPDATE SKIP LOCKED`, marks it occupied, and inserts the active ticket before committing. Competing requests cannot assign the same row. A partial unique index on active slots provides a second database-level guarantee.

## Run

1. Start infrastructure: `docker compose up -d`
2. Copy `server/.env.example` to `server/.env`
3. For a brand-new Docker volume, the schema and seed run automatically. For an existing database created before authentication was added, apply `database/migration-auth.sql` once with `psql` or your PostgreSQL client.
4. Install backend packages: `cd server && npm install`
5. Start backend: `npm run dev`
6. In another terminal: `cd client && npm run dev`
7. Open `http://localhost:5173`

Development login: `admin` / `change-me-now`. Change the seeded credential and `JWT_SECRET` before production use.

## Tests

Run the complete suite with PostgreSQL, MongoDB, and Redis running: `cd server`, then PowerShell `$env:RUN_INTEGRATION='1'; npm test`. This runs API validation, parking/full-lot, duplicate vehicle, both exit paths, fare, slot release, and the simultaneous last-slot test. The concurrency test uses temporary plates and cleans up its own records.

## API

- `POST /api/parking/park` with `{ vehicleNumber, vehicleType }`
- `POST /api/parking/exit` with `{ ticketId }` or `{ vehicleNumber }`
- `GET /api/parking/slots`
- `GET /api/parking/active`
- `GET /api/parking/history`
- `GET /api/health`

The active and history endpoints support `?page=1&limit=25` (maximum limit 100). See [DESIGN.md](DESIGN.md) for the design document, schema rationale, scaling plan, security approach, and demo procedure.

## Submission safety

Submit source files, `database/`, `client/src/`, `server/src/`, tests, `README.md`, `DESIGN.md`, `SUBMISSION_CHECKLIST.md`, package manifests, and `docker-compose.yml`. Do not submit `server/.env`, `node_modules/`, or build output. The root `.gitignore` excludes local environment files and generated dependencies. The seed contains only a deliberately documented development account and a one-way bcrypt hash; replace it for production and never use the development password outside a demo.

Fare is calculated by the backend: up to 3 hours is ₹30, up to 6 hours is ₹85, and more than 6 hours is ₹120.
