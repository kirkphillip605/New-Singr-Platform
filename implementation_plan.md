# Singr Platform — Multi-Phase Implementation Plan

## Goal

Build the complete Singr Platform monorepo in strict, sequential phases. Each phase produces a working, testable increment. Phases with independent sub-tasks identify where concurrent agents can be deployed.

---

## Architecture Overview

```mermaid
graph TB
    subgraph "Docker Compose Environment"
        NPM["Nginx Proxy Manager<br/>SSL Termination"]
        
        subgraph "Frontend Containers"
            MKT["web-marketing<br/>Astro :93010"]
            HOST["web-host<br/>Next.js :93011"]
            SINGER["mobile-singer<br/>F7+Capacitor :93012"]
            ADMIN["web-admin<br/>Next.js :93013"]
        end
        
        subgraph "Backend"
            API["api-node<br/>Express :93001<br/>+ WebSocket"]
        end
        
        subgraph "Data Layer"
            PG["db-postgres<br/>PostgreSQL 16 :95432"]
            REDIS["cache-redis<br/>Redis :96379"]
        end
    end
    
    NPM --> MKT
    NPM --> HOST
    NPM --> SINGER
    NPM --> ADMIN
    NPM --> API
    
    API --> PG
    API --> REDIS
    MKT -.->|"pricing queries"| PG
    
    LEGACY["OpenKJ/SongbookAgent<br/>C++ Desktop"] -->|"polling /api/v1/legacy/okj/api.php"| API
    DESKTOP["Singr Desktop Agent<br/>Electron/Tauri"] -->|"WebSocket"| API
    MOBILE["iOS/Android<br/>Capacitor"] -->|"REST + WS"| API
```

---

## Phase Summary Table & Parallel Streams

| Stream | Component / Phase | Dependencies | Assigned Agent | Skills & MCP | Est. Complexity |
|--------|-------------------|-------------|----------------|--------------|-----------------|
| - | **Phase 2: Database Layer** | Phase 1 | Completed | `prisma-database-setup`, `prisma-cli` | Medium |
| **Stream A** | **Phase 3: API Core & Auth** | Phase 2 | **Agent Backend-A1** | `better-auth-best-practices`, `redis` | High |
| **Stream A** | **Phase 4: Legacy OpenKJ Adapter** | Phase 3 | **Agent Backend-A2** | `rest-api-design-patterns`, `context7` | High |
| **Stream B** | **Phase 5: Modern REST API** | Phase 3 | **Agent Backend-B1** | `rest-api-design-patterns`, `prisma-client` | High |
| **Stream B** | **Phase 6: Real-time & Workers** | Phase 5 | **Agent Backend-B2** | `redis`, `context7` (socket.io, BullMQ) | Medium |
| **Stream C** | **Phase 7A: Marketing Site (Astro)** | Phase 2 | **Agent Frontend-C1** | `modern-web-guidance`, `context7` | Medium |
| **Stream C** | **Phase 7C: Admin Portal (Next.js)** | Phase 3 | **Agent Frontend-C2** | `modern-web-guidance`, `context7` | Medium |
| **Stream D** | **Phase 7D: Singer App (F7/Capacitor)** | Phase 3 | **Agent Frontend-D1** | `modern-web-guidance`, `context7` | High |
| **Stream D** | **Phase 7B: Host Portal (Next.js)** | Phase 3 | **Agent Frontend-D2** | `modern-web-guidance`, `context7` | High |
| **Stream D** | **Phase 8: Desktop Agent (Electron)** | Phase 6 | **Agent Desktop-D3** | Electron, `context7` | Medium |
| - | **Phase 9: Integration & Hardening** | All Streams | **All Agents (Joint)** | `sentry-sdk-setup`, `chrome-devtools` | Medium |

### Parallel Execution Streams & Agent Assignments

To maximize speed and efficiency, the remaining phases are structured into four parallel streams that can progress concurrently once their base dependencies are met:

```mermaid
gantt
    title Parallel Development Streams
    dateFormat  X
    axisFormat %d
    
    section Core Infrastructure
    Phase 2 (Database Layer) :done, p2, 0, 5
    
    section Stream A (Backend Alpha)
    Phase 3 (API Core & Auth) :active, p3, after p2, 10
    Phase 4 (Legacy OpenKJ) : p4, after p3, 10
    
    section Stream B (Backend Beta)
    Phase 5 (Modern REST API) : p5, after p3, 12
    Phase 6 (Real-time & Workers) : p6, after p5, 8
    
    section Stream C (Frontend Alpha)
    Phase 7A (Marketing Site) :active, p7a, after p2, 8
    Phase 7C (Admin Portal) : p7c, after p3, 12
    
    section Stream D (Frontend Beta & Desktop)
    Phase 7D (Singer App) : p7d, after p3, 15
    Phase 7B (Host Portal) : p7b, after p3, 15
    Phase 8 (Desktop Agent) : p8, after p6, 10
    
    section Integration
    Phase 9 (Integration & Hardening) : p9, after p7b, 8
```

#### Stream A: Backend Alpha (API Core & Legacy compatibility)
*   **Agent Backend-A1:** Phase 3 (Express foundation, Redis client, middlewares, exception handling, and error middleware).
*   **Agent Backend-A2:** Phase 4 (Legacy `/api/v1/legacy/okj/api.php` PHP-mimicry endpoint and commands).
*   *Prerequisites:* Phase 2 complete.

#### Stream B: Backend Beta (Modern API, WebSockets & Queue Workers)
*   **Agent Backend-B1:** Phase 5 (Singer, Host, Admin REST endpoints, PostGIS-style coordinates queries, Zod validations).
*   **Agent Backend-B2:** Phase 6 (WebSocket Server rooms/heartbeats, BullMQ worker configuration and shadow-swap transaction).
*   *Prerequisites:* Phase 3 (Auth and Server foundation) complete.

#### Stream C: Frontend Alpha (Marketing & Administration)
*   **Agent Frontend-C1:** Phase 7A (Astro marketing website, static rendering, dynamic DB pricing table, Stripe integration). *Can start immediately since database schema is ready.*
*   **Agent Frontend-C2:** Phase 7C (Next.js Super-Admin portal, platform metrics, user management, impersonation console).
*   *Prerequisites:* Phase 2 complete for C1; Phase 3 complete for C2.

#### Stream D: Frontend Beta & Desktop (Client Applications)
*   **Agent Frontend-D1:** Phase 7D (Framework7 + Capacitor mobile singer app, map integration, song catalog search, favorites).
*   **Agent Frontend-D2:** Phase 7B (Next.js Host Portal, venue configuration, show controls, drag-and-drop queue management).
*   **Agent Desktop-D3:** Phase 8 (Electron desktop agent, local file scanning, WebSocket state receiver, API key management).
*   *Prerequisites:* Phase 3 complete (and API interface definitions in `packages/shared` established) for D1/D2; Phase 6 complete for D3.

---

## Phase 1: Monorepo Foundation

> **Goal:** Scaffold the Turborepo + pnpm monorepo, Docker Compose infrastructure, shared TypeScript configs, and environment templates.

### Skills & Tools
- **Skill:** `monorepo-management` — Turborepo setup, pnpm workspaces, pipeline config
- **Skill:** `docker-compose` — compose.yaml with healthchecks, profiles, Compose Watch
- **MCP:** `prisma-mcp-server` — validate Prisma can connect once DB container is up

### Parallelism: 2 Concurrent Agents

#### Agent 1A: Monorepo Scaffold
- [ ] Initialize Turborepo monorepo with `pnpm`
- [ ] Create directory structure:
  ```
  /
  ├── apps/
  │   ├── api-node/           # Express API server
  │   ├── web-marketing/      # Astro marketing site
  │   ├── web-host/           # Next.js Host Portal
  │   ├── web-admin/          # Next.js Admin Portal
  │   ├── mobile-singer/      # Framework7 Singer App
  │   └── desktop-agent/      # Electron/Tauri desktop app
  ├── packages/
  │   ├── db/                 # Prisma schema, client, migrations
  │   ├── shared/             # Shared types, constants, validators
  │   ├── ui/                 # Shared UI components (glass UI design system)
  │   └── config/             # Shared ESLint, TSConfig, Prettier
  ├── docker/                 # Dockerfiles per service
  ├── turbo.json
  ├── pnpm-workspace.yaml
  ├── package.json
  ├── .env.example
  └── .gitignore
  ```
- [ ] Configure `turbo.json` pipeline (`build`, `dev`, `lint`, `test`, `type-check`)
- [ ] Create `pnpm-workspace.yaml` with `apps/*` and `packages/*`
- [ ] Create root `package.json` with shared devDependencies (TypeScript 5.x, Prettier, ESLint)
- [ ] Create `packages/config/` with shared `tsconfig.base.json`, ESLint config, Prettier config
- [ ] Create `.env.example` from SAD Section 8

#### Agent 1B: Docker Compose & Infrastructure
- [ ] Create `compose.yaml` (V2, no `version:` field) with services:
  - `db-postgres` — PostgreSQL 16 Alpine on port `95432`, healthcheck, named volume
  - `cache-redis` — Redis 7 Alpine on port `96379`, healthcheck, named volume
  - `api-node` — build context `apps/api-node`, port `93001`, depends_on `db-postgres` + `cache-redis` (service_healthy)
  - `web-marketing` — port `93010`
  - `web-host` — port `93011`
  - `mobile-singer` — port `93012`
  - `web-admin` — port `93013`
- [ ] Add Compose Watch (`develop.watch`) blocks for `api-node` dev reloading
- [ ] Add profiles: `debug` (pgAdmin), `monitoring` (future)
- [ ] Create `docker/` directory with Dockerfile templates (multi-stage: deps → builder → runner)
- [ ] Create `.env` template for Docker with all required env vars

### Verification
- `pnpm install` succeeds at root
- `docker compose config` validates without errors
- `docker compose up db-postgres cache-redis -d` starts both services healthy
- `turbo run build --dry-run` shows correct task graph

---

## Phase 2: Database Layer

> **Goal:** Translate the SAD's complete SQL schema into Prisma models, run initial migration, and create seed data.

### Skills & Tools
- **Skill:** `prisma-database-setup` — PostgreSQL provider, driver adapter (`@prisma/adapter-pg`)
- **Skill:** `prisma-cli` — `prisma init`, `prisma migrate dev`, `prisma generate`
- **Skill:** `prisma-client-api` — query patterns for seed data
- **MCP:** `prisma-mcp-server` — `migrate-dev`, `migrate-status` for migration management
- **MCP:** `postgres` — `query` to validate schema post-migration

### Deliverables

#### [NEW] `packages/db/prisma/schema.prisma`
Full Prisma schema mapping all SAD Section 5 tables:
- `User` → `users` (with `roles String[]`, soft-delete fields, business/singer profile fields)
- `Session` → `sessions` (with `impersonatedBy`)
- `Account` → `accounts`
- `Passkey` → `passkeys`
- `Verification` → `verifications`
- `TwoFactor` → `two_factors`
- `HostTeamMember` → `host_team_members`
- `HostProfile` → `host_profiles`
- `SubscriptionTier` → `subscription_tiers` (PK = `stripePriceId`)
- `Venue` → `venues` (with `lat`/`lon` Float, `hoursOfOperation` Json, soft-delete)
- `Show` → `shows` (with `legacyId` autoincrement, `serialCounter`, soft-delete)
- `System` → `systems` (with `apiKey`, gap-fill `systemNumber`, soft-delete)
- `Song` → `songs` (with `searchVector` Unsupported("tsvector"))
- `SongShadow` → `songs_shadow`
- `Request` → `requests` (with `legacyId` autoincrement, soft-delete via `status`)
- `Favorite` → `favorites` (unique compound `[usersId, artist, title]`)

> [!IMPORTANT]
> **tsvector handling:** Prisma does not natively support `tsvector`. We will use `Unsupported("tsvector")` in the schema and manage the `search_vector` column + GIN index via a raw SQL migration file.

#### [NEW] `packages/db/prisma.config.ts`
Prisma 7 config with `dotenv` loading and `DATABASE_URL` from env.

#### [NEW] `packages/db/src/client.ts`
Singleton Prisma Client instantiation with `@prisma/adapter-pg` driver adapter.

#### [NEW] `packages/db/prisma/seed.ts`
Seed script creating:
- 1 `global_admin` user
- 1 `host` user with a `HostProfile`
- 2 `singer` users
- 1 public venue + 1 private venue
- 1 show per venue
- 1 system with an API key
- Sample songs (50) in the system's songbook
- Sample requests

#### [NEW] `packages/db/prisma/migrations/` (auto-generated)
Plus a manual post-migration SQL for:
- `search_vector tsvector` column
- GIN index on `songs.search_vector`
- Trigger to auto-populate `search_vector` from `artist || ' ' || title`

### Verification
- `npx prisma migrate dev --name init` runs clean against `db-postgres`
- `npx prisma generate` produces client in `packages/db/generated/`
- `npx prisma db seed` populates test data
- **MCP `postgres.query`**: `SELECT count(*) FROM users` returns expected count
- **MCP `prisma-mcp-server.migrate-status`**: shows all migrations applied

---

## Phase 3: API Core & Authentication

> **Goal:** Stand up the Express.js API server with Better Auth, all auth plugins, middleware stack, and Redis session/rate-limit integration.

### Skills & Tools
- **Skill:** `better-auth-best-practices` — Server config, database hooks, session management
- **Skill:** `create-auth-skill` — Route handler setup for Express, plugin configuration
- **Skill:** `email-and-password-best-practices` — Password reset, email verification
- **Skill:** `two-factor-authentication-best-practices` — TOTP, backup codes
- **Skill:** `redis` — Secondary storage for sessions and rate limiting
- **MCP:** `context7` — Query Better Auth docs for latest API patterns

### Parallelism: 2 Concurrent Agents

#### Agent 3A: Express Server & Middleware

##### [NEW] `apps/api-node/src/index.ts`
Express server entry point:
- CORS configured for all subdomains (`*.singrkaraoke.com`)
- JSON body parser
- Request logging (pino or morgan)
- Error handling middleware
- Health check endpoint (`GET /health`)
- Mount routes: `/api/auth/*`, `/api/v1/*`, `/api/v1/legacy/*`

##### [NEW] `apps/api-node/src/middleware/`
- `auth.middleware.ts` — Session validation via Better Auth
- `rbac.middleware.ts` — Role-based access control checking `user.roles` array
- `rate-limit.middleware.ts` — Redis-backed rate limiter
- `error-handler.middleware.ts` — Centralized error responses
- `soft-delete.middleware.ts` — Prisma middleware to filter `deleted_at IS NULL`

##### [NEW] `apps/api-node/src/lib/redis.ts`
Redis client (ioredis) singleton, configured from `REDIS_URL`.

#### Agent 3B: Better Auth Configuration

##### [NEW] `apps/api-node/src/lib/auth.ts`
Better Auth server instance with:
- **Database:** Prisma adapter pointing to `@singr/db`
- **Plugins:**
  - `passkey` — WebAuthn support
  - `magicLink` — Mailjet integration for passwordless email
  - `phoneNumber` — Twilio Verify for SMS/OTP
  - `twoFactor` — TOTP + backup codes
  - `admin` — User management, impersonation
  - `anonymous` — Session-based anonymous users
- **Session config:**
  - `secondaryStorage` → Redis (for session store + rate limiting)
  - `crossSubDomainCookies.enabled: true` (share cookies across `*.singrkaraoke.com`)
  - `cookieCache` strategy: `compact`
- **Social providers:** Google OAuth, Apple OAuth (tokens exchanged from Capacitor native SDKs)
- **Account linking:** Enabled (auto-link by email)
- **Database hooks:**
  - `user.create.before` — set default roles `['singer']`
- **Custom fields on User:** `roles`, `firstName`, `lastName`, `phoneNumber`, `businessName`, `businessLogo`, `businessAbout`, `singerAbout`, `isAnonymous`

##### [NEW] `apps/api-node/src/lib/auth-client.ts`
Auth client for server-side session checks.

##### [NEW] `apps/api-node/src/routes/auth.routes.ts`
Express route handler: `app.all("/api/auth/*splat", toNodeHandler(auth))`

### Verification
- `GET /api/auth/ok` returns `{ status: "ok" }`
- `POST /api/auth/sign-up/email` creates a user in DB
- `POST /api/auth/sign-in/email` returns a session cookie
- Session cookie works across subdomain simulation
- Redis contains session data
- Rate limiting blocks after threshold

---

## Phase 4: Legacy OpenKJ Adapter

> **Goal:** Implement the `/api/v1/legacy/okj/api.php` endpoint that perfectly mimics the defunct OkjSongbook PHP API for backward compatibility with the C++ SongbookAgent.

### Skills & Tools
- **Skill:** `rest-api-design-patterns` — Request/response patterns
- **Skill:** `prisma-client-api` — Efficient bulk operations for songbook sync
- **MCP:** `context7` — Resolve OpenKJ source for exact payload formats
- **MCP:** `github` — `get_file_contents` to read OpenKJ C++ source from `OpenKJ/SongbookAgent`

> [!WARNING]
> This is the most delicate component. The C++ Qt app sends specific JSON payloads and expects exact response formats. We must study the OpenKJ source code (`okjsongbookapi.h`, `okjsongbookapi.cpp`) to ensure byte-level compatibility.

### Pre-work: Study OpenKJ Source
Before implementation, fetch and analyze:
1. `OpenKJ/SongbookAgent/src/okjsongbookapi.h` — Command enum, method signatures
2. `OpenKJ/SongbookAgent/src/okjsongbookapi.cpp` — Request payload construction, response parsing
3. `OpenKJ/OpenKJ/src/okjsongbookapi.cpp` — Main OpenKJ app's API integration

### Deliverables

#### [NEW] `apps/api-node/src/routes/legacy/`

##### `okj-adapter.routes.ts`
Single POST endpoint at `/api/v1/legacy/okj/api.php` that:
1. Validates `api_key` against `systems` table
2. Validates `system_id` matches `system_number` for that key (reject with specific error if mismatched)
3. Dispatches to command handler based on `command` field

##### `okj-commands.ts`
Command handlers:
- **Polling:**
  - `getEntitledSystemCount` — Returns count of systems for the host
  - `getSerial` — Returns `shows.serial_counter` for the active show
  - `sacCurVersion` — Returns current version string
  - `getAlert` — Returns system alerts (empty by default)
- **Venue & Queue:**
  - `getVenues` — Returns all venues linked to the host (with integer IDs)
  - `setAccepting` — Toggles `shows.is_accepting`, increments `serial_counter`
  - `getRequests` — Returns pending requests with integer `legacy_id` mapping
  - `deleteRequest` — **Soft delete only**: `UPDATE requests SET status = 'processed'`, increment `serial_counter`
  - `clearRequests` — **Soft delete all**: `UPDATE requests SET status = 'processed' WHERE shows_id = ?`, increment `serial_counter`
- **Songbook Sync:**
  - `clearDatabase` — Truncates `songs_shadow` for `systems_id`, sets `is_accepting = false`
  - `addSongs` — Bulk inserts 1,000-song chunks into `songs_shadow`, pushes/resets 5-second BullMQ debounce job

##### `okj-response-format.ts`
Response formatting utilities ensuring exact compatibility with the C++ parser.

### Verification
- Send `getSerial` with valid `api_key` → returns integer serial
- Send `getSerial` with mismatched `system_id` → returns specific error
- Send `addSongs` with 1,000 songs → rows appear in `songs_shadow`
- Send `deleteRequest` → request status becomes `'processed'` (NOT deleted)
- Send `clearRequests` → all requests soft-deleted, `serial_counter` incremented
- End-to-end: simulate full song sync cycle (`clearDatabase` → N × `addSongs` → debounce fires → live songs swapped)

---

## Phase 5: Modern REST API

> **Goal:** Implement all `/api/v1/*` endpoints for the modern web and mobile clients.

### Skills & Tools
- **Skill:** `rest-api-design-patterns` — Resource modeling, pagination, filtering, error handling
- **Skill:** `prisma-client-api` — Complex queries, transactions, full-text search

### Parallelism: 2 Concurrent Agents

#### Agent 5A: Public & Singer Endpoints

##### [NEW] `apps/api-node/src/routes/v1/shows.routes.ts`
- `GET /v1/shows/nearby` — PostGIS-style query using `lat`/`lon` with distance calculation, filtering `venues.is_private = false` AND `shows.is_accepting = true`
- `POST /v1/shows/:slug/join` — Validate `pin_code` for private shows, return show details + catalog access
- `GET /v1/shows/:slug/catalog` — Full-text search against `songs.search_vector` using `to_tsquery`

##### [NEW] `apps/api-node/src/routes/v1/requests.routes.ts`
- `POST /v1/requests` — Submit song request (authenticated or anonymous via Better Auth), increment `serial_counter`, emit WebSocket event
- `GET /v1/requests` — Get requests for a show (host view)
- `PATCH /v1/requests/:id` — Update request status
- `DELETE /v1/requests/:id` — Soft delete (set `status = 'processed'`)

##### [NEW] `apps/api-node/src/routes/v1/users.routes.ts`
- `GET /v1/users/history` — Retrieve pending/processed requests with cross-venue favorite highlighting
- `GET /v1/users/favorites` — List favorites
- `POST /v1/users/favorites` — Add favorite
- `DELETE /v1/users/favorites/:id` — Remove favorite

#### Agent 5B: Host & Admin Endpoints

##### [NEW] `apps/api-node/src/routes/v1/venues.routes.ts`
- `GET /v1/venues` — List host's venues
- `POST /v1/venues` — Create venue (public via Google Places autocomplete or private manual)
- `PATCH /v1/venues/:id` — Update private venue only (public venues are protected)
- `POST /v1/venues/:id/sync` — Rate-limited Google Places sync (max 1/24hr)
- `DELETE /v1/venues/:id` — Soft delete

##### [NEW] `apps/api-node/src/routes/v1/systems.routes.ts`
- `GET /v1/systems` — List host's hardware systems
- `POST /v1/systems` — Create system with gap-fill `system_number` logic
- `DELETE /v1/systems/:id` — Soft delete (frees the `system_number` gap)
- `POST /v1/systems/:id/regenerate-key` — Regenerate API key

##### [NEW] `apps/api-node/src/routes/v1/admin.routes.ts`
- `POST /v1/admin/impersonate` — Exchange admin token for target-user session, log `impersonated_by`
- `GET /v1/admin/users` — Paginated user list with filtering
- `PATCH /v1/admin/users/:id/ban` — Ban user (soft delete)
- `GET /v1/admin/metrics` — Platform-wide metrics

##### [NEW] `apps/api-node/src/routes/v1/shows-management.routes.ts`
- `POST /v1/shows` — Create show linked to venue
- `PATCH /v1/shows/:id` — Update show settings
- `DELETE /v1/shows/:id` — Soft delete
- `PATCH /v1/shows/:id/accepting` — Toggle accepting, increment serial

##### [NEW] `apps/api-node/src/routes/v1/teams.routes.ts`
- `GET /v1/teams` — List host's team members
- `POST /v1/teams/invite` — Invite user as `host_manager`
- `DELETE /v1/teams/:id` — Remove team member

##### [NEW] `apps/api-node/src/routes/v1/billing.routes.ts`
- `GET /v1/billing/tiers` — List subscription tiers from DB (not Stripe API)
- `POST /v1/billing/checkout` — Create Stripe checkout session
- `POST /v1/billing/webhook` — Stripe webhook handler (signature verification, update `host_profiles` + `subscription_tiers`)

### Verification
- `GET /v1/shows/nearby?lat=30.2&lon=-97.7` returns shows with distance sorting
- `GET /v1/shows/friday-vibes/catalog?q=bohemian` returns FTS results
- `POST /v1/requests` creates request + increments serial
- `POST /v1/systems` with gap-fill: delete system 2 of [1,2,3], create new → gets number 2
- `POST /v1/admin/impersonate` creates session with `impersonated_by` logged

---

## Phase 6: Real-time & Background Workers

> **Goal:** WebSocket server for modern real-time updates + BullMQ workers for the songbook sync debounce workflow.

### Skills & Tools
- **Skill:** `redis` — BullMQ queue management
- **MCP:** `context7` — Query `ws` or `socket.io` docs for WebSocket patterns

### Parallelism: 2 Concurrent Agents

#### Agent 6A: WebSocket Server

##### [NEW] `apps/api-node/src/ws/`
- `ws-server.ts` — WebSocket server attached to the Express HTTP server
  - Authentication: validate session cookie/token on connection
  - Room management: join/leave show rooms by `shows_id`
  - Events emitted:
    - `new_request` — When a singer submits a request
    - `request_cancelled` — When a request is soft-deleted
    - `queue_reordered` — When host reorders the queue
    - `direct_message` — Host-to-singer messaging
  - Connection state management with heartbeat/ping-pong

#### Agent 6B: BullMQ Workers

##### [NEW] `apps/api-node/src/workers/`
- `song-sync.worker.ts` — The songbook shadow-swap worker:
  1. Triggered by debounced BullMQ job (5-second delay, reset on each `addSongs` chunk)
  2. Within a Prisma transaction:
     a. Delete live `songs` for the `systems_id`
     b. Copy `songs_shadow` → `songs` (with `search_vector` generation)
     c. Set `shows.is_accepting = true`
     d. Increment `shows.serial_counter`
  3. Emit WebSocket event to connected clients
  4. Truncate `songs_shadow` for the system

- `song-sync.queue.ts` — BullMQ queue definition with:
  - Job ID keyed by `systems_id` (ensures only one debounce per system)
  - 5-second delay
  - `removeOnComplete: true`
  - Retry logic with exponential backoff

### Verification
- Connect WebSocket client → authenticate → join show room
- Submit a request via REST → WebSocket client receives `new_request` event
- Full song sync: `clearDatabase` → 3 × `addSongs`(1000 each) → wait 5s → worker fires → live songs = 3000, shadow empty
- Worker doesn't fire if chunks keep arriving within 5s window (debounce resets)

---

## Phase 7: Frontend Applications

> **Goal:** Build all four frontend applications concurrently. All UIs share the "glass UI" design system — professional, transparent, high-legibility in dark environments. **No neon, no glowing stage lights, no cliché karaoke effects.**

### Skills & Tools
- **Skill:** `modern-web-guidance` — **MANDATORY first** for all HTML/CSS/JS tasks. Modern CSS, View Transitions, container queries, `:has()`, scroll-driven animations
- **Skill:** `a11y-debugging` — Accessibility audit for all apps
- **MCP:** `context7` — Query framework docs (Next.js, Astro, Framework7)

> [!IMPORTANT]
> **Glass UI Aesthetic Constraint:** Premium transparent design with frosted-glass panels, subtle backdrop-blur, minimal shadows, high contrast text on dark backgrounds. Think "Bloomberg Terminal meets Apple Vision Pro." Zero karaoke kitsch.

### Parallelism: 4 Concurrent Agents

#### Agent 7A: Marketing Site (Astro)

##### [NEW] `apps/web-marketing/`
- Astro project with zero-JS by default, React islands for interactive components
- Pages:
  - `/` — Hero, features overview, pricing (pulled from `subscription_tiers` DB)
  - `/host` — Host-specific features, CTA to Host Portal
  - `/singer` — Singer-specific features, CTA to Singer App
  - `/pricing` — Dynamic pricing grid synced from PostgreSQL
- SEO: meta tags, OG images, structured data, sitemap
- Performance: static-generated, content-visibility, Fetch Priority

#### Agent 7B: Host Portal (Next.js)

##### [NEW] `apps/web-host/`
- Next.js App Router with SSR
- Pages:
  - `/dashboard` — Show overview, active requests, quick actions
  - `/venues` — CRUD venue management (Google Places autocomplete for public)
  - `/shows` — Show management, toggle accepting
  - `/systems` — Hardware system management, API key display/regenerate
  - `/queue` — Live request queue with drag-to-reorder
  - `/team` — Team member management
  - `/billing` — Subscription management, Stripe checkout
  - `/settings` — Profile, business info, logo upload
- Auth: Better Auth React client, session-gated routes
- Real-time: WebSocket connection for live queue updates

#### Agent 7C: Admin Portal (Next.js)

##### [NEW] `apps/web-admin/`
- Next.js App Router
- Pages:
  - `/dashboard` — Platform metrics, active shows, user counts
  - `/users` — User management with search, ban/unban, impersonate
  - `/subscriptions` — Subscription triage, tier management
  - `/shows` — Global show monitoring
- Auth: Restricted to `global_admin` and `support_admin` roles
- Impersonation: "View as User" feature using admin impersonation API

#### Agent 7D: Singer App (Framework7 + Capacitor)

##### [NEW] `apps/mobile-singer/`
- Framework7 with React
- Views:
  - **Nearby Shows** — Map + list view of accepting shows (PostGIS nearby query)
  - **Show View** — Songbook search, request submission, queue position
  - **Join Private Show** — PIN code entry
  - **History** — Past requests across all venues, favorite highlighting
  - **Favorites** — Saved songs
  - **Profile** — Account settings, linked providers
- Auth: Anonymous sessions by default, prompt to register for persistent history
- Capacitor: Ready for native iOS/Android wrapping (Apple/Google OAuth SDKs)

### Shared Deliverable: Glass UI Design System

##### [NEW] `packages/ui/`
- CSS custom properties for the glass design system:
  - `--glass-bg: rgba(255, 255, 255, 0.05)`
  - `--glass-border: rgba(255, 255, 255, 0.1)`
  - `--glass-blur: 20px`
  - Dark background palette (deep navy/charcoal, not pure black)
  - Typography: Inter or similar professional sans-serif from Google Fonts
  - Accent colors: muted blues, teals — no neon
- Shared React components: `GlassCard`, `GlassButton`, `GlassInput`, `GlassModal`, `GlassNav`
- Micro-animations: subtle hover lifts, backdrop-blur transitions

### Verification
- Marketing site: Lighthouse score > 90 for Performance, Accessibility, SEO
- Host Portal: Full CRUD flow for venues, shows, systems
- Admin Portal: Impersonation creates correct session
- Singer App: Search → Request → Queue position updates via WebSocket
- All apps: Glass UI aesthetic — no karaoke kitsch

---

## Phase 8: Desktop Agent

> **Goal:** Build the modern Singr Desktop Agent (Electron or Tauri) that replaces OpenKJ's polling with WebSocket-powered real-time updates.

### Skills & Tools
- **MCP:** `context7` — Query Electron/Tauri docs

### Deliverables

##### [NEW] `apps/desktop-agent/`
- Electron or Tauri app with React UI (reusing `packages/ui` glass design system)
- Features:
  - WebSocket connection to `ws://api.singrkaraoke.com`
  - Real-time request queue display
  - Songbook management (local file scanning → bulk upload to API)
  - Show management (create, toggle accepting)
  - Direct messaging to singers
- Auth: Better Auth session, stored securely in OS keychain

### Verification
- App connects via WebSocket, receives real-time events
- Song sync works (local files → shadow → swap)
- Queue updates appear instantly without polling

---

## Phase 9: Integration, Sentry & Production Hardening

> **Goal:** End-to-end integration testing, error monitoring, security hardening, and deployment readiness.

### Skills & Tools
- **Skill:** `sentry-sdk-setup` — Node.js SDK for API, Next.js SDK for portals, Browser SDK for singer app
- **Skill:** `chrome-devtools` — Performance profiling, network analysis
- **Skill:** `a11y-debugging` — Full accessibility audit

### Parallelism: 2 Concurrent Agents

#### Agent 9A: Sentry & Monitoring
- [ ] Install `@sentry/node` in `api-node`
- [ ] Install `@sentry/nextjs` in `web-host` and `web-admin`
- [ ] Install `@sentry/browser` in `mobile-singer`
- [ ] Configure source maps, release tracking
- [ ] Add custom Sentry breadcrumbs for legacy API commands

#### Agent 9B: Security & Production
- [ ] HTTPS-only cookies in production (`advanced.useSecureCookies: true`)
- [ ] CSRF protection verification
- [ ] Rate limiting tuning (per-endpoint limits)
- [ ] Input validation (zod schemas for all endpoints)
- [ ] SQL injection prevention audit
- [ ] Stripe webhook signature verification
- [ ] Docker production Dockerfiles (minimal `runner` stage, non-root user)
- [ ] Nginx Proxy Manager configuration templates

### End-to-End Verification
- [ ] Full singer flow: find show → search catalog → submit request → see in queue
- [ ] Full host flow: create venue → create show → receive request → mark played
- [ ] Full legacy flow: OpenKJ connects → uploads songbook → receives requests
- [ ] Admin flow: impersonate user → verify session logs
- [ ] Role bridging: host logs in → opens singer app → submits request at another show

---

## Resolved Decisions

| Decision | Resolution |
|----------|------------|
| **Prisma version** | Latest stable (Prisma 7) with `prisma.config.ts` and `@prisma/adapter-pg` |
| **Desktop Agent** | Electron (React UI, reusing `packages/ui`) |
| **WebSocket library** | socket.io (rooms, auto-reconnect, fallback transports) |
| **Stripe integration** | Real Stripe test keys provided — full implementation in Phase 5 |
| **Google Places API** | Mock/stub initially — swap for real API when keys are provided |

### Local Development Database

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Username | `kirkphillip` |
| Password | `Jameson5475` |
| Database | `singr_dev` |
| Connection string | `postgresql://kirkphillip:Jameson5475@localhost:5432/singr_dev?schema=public` |

> [!NOTE]
> For local development, we connect directly to the host PostgreSQL instance rather than the Docker `db-postgres` container. The Docker Compose `db-postgres` service will be available for CI/staging.

### Stripe Webhook Configuration

**Webhook Endpoint URL:** `https://api.singrkaraoke.com/api/v1/billing/webhook`
(For local testing: `http://localhost:93001/api/v1/billing/webhook` — use Stripe CLI to forward)

**Events to select in Stripe Dashboard:**
- `price.created`
- `price.updated`
- `price.deleted`
- `product.created`
- `product.updated`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

> [!TIP]
> For local development, run `stripe listen --forward-to localhost:93001/api/v1/billing/webhook` to tunnel webhook events to your local API.
