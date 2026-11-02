# Budgeteer (Web)

A React + Express port of the Budgeteer iOS app. Expenses, bills, paydays, and accounts are stored in MongoDB.
Each registered user has a private budget. Passport local authentication issues expiring JWT bearer tokens;
Passport JWT authentication protects every budget endpoint.

```
budgeteer-web/
├── server/   Express REST API backed by MongoDB
└── client/   React (Vite) single-page app
```

## Prerequisites

- Node.js 22.9+ (for `--env-file-if-exists`).
- MongoDB, reachable from the API server (integration-tested with the supplied MongoDB 4.2 server).
  Upgrade old MongoDB releases before production use. The configured database user must be able to
  read/write the database and create indexes. The development server at `mongodb://10.0.0.244/` currently
  requires no database credentials; keep it on a trusted network.

## Configuration

The server reads environment variables or `server/.env`; see [server/.env.example](server/.env.example).

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `MONGODB_URL` | no | `mongodb://10.0.0.244/` | MongoDB connection string (can include credentials) |
| `MONGODB_DATABASE` | no | `budgeteer` | Database name, configured separately from the connection URL |
| `JWT_SECRET` | yes | none | Random signing secret of at least 32 bytes; keep it private and stable across restarts |
| `PORT` | no | `3001` | API port |

Generate a signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy `server/.env.example` to `server/.env` and set `JWT_SECRET` to the generated value. The `.env` file
is ignored by version control. MongoDB database credentials and app account passwords are separate:
an unauthenticated MongoDB server does not disable app authentication.

This version starts fresh in MongoDB; it does **not** import existing Couchbase data or users from the example API.
Couchbase configuration and the Couchbase SDK are no longer used.

## Running locally

```bash
npm run install:all

# Terminal 1 - API on http://localhost:3001 (reads server/.env)
npm run dev:server

# Terminal 2 - UI on http://localhost:5173/budgeteer/ (proxies /api/budgeteer to the server)
npm run dev:client
```

Open the UI, choose **Create an account**, and enter a username and password. Usernames are case-insensitive,
3-64 letters, numbers, dots, underscores or hyphens; passwords require at least 12 characters
and at most 1024 UTF-8 bytes. Registration signs you in immediately. Passwords are stored as salted scrypt hashes.

JWTs expire after one hour. The browser holds the token **in memory only**, not in local/session storage;
reloading the page requires signing in again. Sign out clears the local token and budget state.
Expired sessions return to the sign-in screen. Tokens are not revoked server-side on sign out: a copied token
remains usable until expiry (or signing-secret rotation / account deletion).

Login and registration share an in-memory limit of 30 attempts per client IP per 15 minutes. A multi-instance
deployment should use a shared limiter store. If deploying behind a reverse proxy, configure Express's
`trust proxy` for the actual proxy topology before relying on per-client limits; do not trust arbitrary forwarded headers.
Use HTTPS outside local development, database authentication, and a production secret.

Set `API_URL` when starting the client if the API is not on `http://localhost:3001`.
`npm run build` builds the client. With `NODE_ENV=production`, Express serves `client/dist` alongside `/api/budgeteer`.
When deploying behind nginx, proxy `/api/budgeteer/` to Express without stripping that prefix.

## Deploying with Docker Compose

Install Docker Engine with the Compose plugin, or Docker Desktop. From `budgeteer-web`:

1. If `server/.env` does not already exist, copy `server/.env.example` to `server/.env` and set
   `JWT_SECRET` using the secret-generation command above. Keep this secret stable between deployments.
2. Build and start:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:8080` (or `http://<docker-host>:8080` from another machine).

[compose.yaml](compose.yaml) includes the real database address `mongodb://10.0.0.244/` and database
`budgeteer`. It does not create a MongoDB container or store data inside the app container.
The Docker host/container must be able to reach `10.0.0.244:27017`.
These Compose environment settings take precedence over database settings in `server/.env`;
edit them in `compose.yaml` if moving the database.

The multi-stage [Dockerfile](Dockerfile) builds the React app and packages it with Express in one
non-root Node.js container. Only port 8080 is published; the UI and API share the same origin.
The signing secret is loaded at runtime from `server/.env`, which is excluded from the build context.
There is a health check and an automatic restart policy. Health status checks API responsiveness;
MongoDB connectivity and required indexes are checked during startup.
Container replacement does not delete MongoDB data.

```bash
# Optional: choose a different host port
WEB_PORT=8090 docker compose up -d --build

docker compose ps
docker compose logs -f
docker compose down
```

Port 8080 is plain HTTP and exposed on all host interfaces by default. Keep access on a trusted LAN
or place an HTTPS reverse proxy in front before exposing this publicly. The API does not trust
forwarded IP headers by default; configure a trusted proxy topology before relying on per-client
rate limits behind an additional proxy.

## Tests

```bash
# In-memory API tests, authentication/configuration tests, and client tests
npm test
npm run build

# Additionally exercise real MongoDB, including reconnect/persistence and per-user isolation
MONGODB_TEST_URL=mongodb://10.0.0.244/ npm --prefix server test
```

The MongoDB integration test creates a uniquely named `budgeteer_test_<uuid>` database and drops **only that
test database** afterwards. It does not write to the configured app database.

## REST API

`GET /api/budgeteer/health` is public. Authentication endpoints:

| Method | Path | Body / response |
| ------ | ---- | --------------- |
| POST | `/api/budgeteer/auth/register` | `{ username, password }` -> `{ user: { id, username }, token }` (201) |
| POST | `/api/budgeteer/auth/login` | `{ username, password }` -> `{ user: { id, username }, token }` |
| GET | `/api/budgeteer/auth/me` | Bearer token required; returns `{ id, username }` |

All budget endpoints require `Authorization: Bearer <token>` and only access the authenticated user's data.
Another user's document IDs return 404 on update/delete. Supplied ownership fields are ignored.
Missing or invalid tokens return 401; invalid input returns 400, duplicate usernames 409, and throttled
authentication requests 429. Errors are JSON objects with an `error` message.

| Method | Path | Body |
| ------ | ---- | ---- |
| GET | `/api/budgeteer/transactions` | |
| POST | `/api/budgeteer/transactions` | `{ amount, category?, timestamp? }` (negative = credit) |
| PUT | `/api/budgeteer/transactions/:id` | same as POST |
| DELETE | `/api/budgeteer/transactions/:id` | |
| GET | `/api/budgeteer/bills` | |
| POST | `/api/budgeteer/bills` | `{ name, amount, leftToPay, dayOfMonth }` |
| PUT | `/api/budgeteer/bills/:id` | same as POST |
| DELETE | `/api/budgeteer/bills/:id` | |
| GET | `/api/budgeteer/paydays` | |
| POST | `/api/budgeteer/paydays` | `{ name, amount, exampleDate: "YYYY-MM-DD" }` |
| PUT | `/api/budgeteer/paydays/:id` | same as POST |
| DELETE | `/api/budgeteer/paydays/:id` | |

Budget documents use MongoDB's `documents` collection, with string `_id` keys such as `bill::<uuid>`,
a `type` discriminator, and a `userId`. Responses preserve the original `{ id, ...fields }` API shape and
omit database/ownership metadata. Accounts live in the `users` collection with a unique username index.
Startup creates required indexes and fails explicitly if MongoDB is unavailable or index creation fails.
