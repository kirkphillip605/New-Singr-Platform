# Singr Platform - Software Architecture Document (SAD)

## 1. Executive Summary

The Singr platform is a modern, multi-tenant SaaS application providing cloud-based songbook search, request functionality, and venue management for the karaoke industry.

It serves four distinct environments simultaneously:

1. **Legacy Compatibility:** A strict API adapter masquerading as the defunct OkjSongbook service to support the OpenKJ `SongbookAgent` C++ desktop software.
2. **Marketing Hub:** A blazing-fast, SEO-optimized public site mapping dynamic pricing.
3. **Modern Web & Mobile Ecosystem:** A suite of applications for singers, hosts, and admins featuring a professional "glass UI" aesthetic.
4. **Native Desktop Agent:** A modern, WebSocket-powered native desktop application replacing OpenKJ's legacy polling mechanisms with real-time features.

---

# 2. Monorepo Architecture & Tech Stack

The project utilizes a monorepo structure (`Turborepo` + `pnpm`) to share business logic, API clients, and UI components.

## 2.1 Core Tech Stack

- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Backend:** Node.js / Express.js
- **Authentication:** Better Auth
  - Mailjet for email magic links
  - Twilio Verify for SMS/OTP
  - WebAuthn for Passkeys
- **Caching & Queues:** Redis + BullMQ
- **Desktop App:** Electron or Tauri (React)
- **Web Portals:** Next.js (SSR/SSG)
- **Marketing Site:** Astro (Zero-JS by default, React for interactive islands)
- **Mobile Apps:** Framework7 + Capacitor
- **Monitoring & Error Tracking:** Sentry

---

# 3. Deployment Topology

The system runs in a fully self-contained Docker Compose environment. Nginx Proxy Manager (NPM) handles SSL termination and proxies subdomains to internal Docker containers.

| Domain / Subdomain | Target Container | Port | Description |
|---|---|---|---|
| `singrkaraoke.com` | `web-marketing` | `93010` | Astro public site. Handles Singer/Host routing, features, and DB-synced Stripe pricing |
| `host.singrkaraoke.com` | `web-host` | `93011` | Next.js authenticated Host Portal / Desktop PWA |
| `admin.singrkaraoke.com` | `web-admin` | `93013` | Next.js Super-admin portal for metrics, impersonation, and platform management |
| `app.singrkaraoke.com` | `mobile-singer` | `93012` | Framework7 Singer Web App / PWA (Capacitor entry point) |
| `api.singrkaraoke.com` | `api-node` | `93001` | Express API, WebSockets, Better Auth, and Legacy OpenKJ Adapter |
| *(Internal Only)* | `db-postgres` | `95432` | PostgreSQL 16 database |
| *(Internal Only)* | `cache-redis` | `96379` | Redis for rate-limiting, sessions, and background queues |

---

# 4. Identity & Role-Based Access Control (RBAC)

Authentication is managed centrally via Better Auth, supporting seamless cross-platform identity.

## 4.1 Roles & Permissions (`roles TEXT[]`)

- `global_admin`
  - Full CRUD access to all tables
  - Can impersonate any user
  - Cannot hold `singer` or `host` roles

- `support_admin`
  - Limited CRUD access (bans, subscription triage)
  - Can impersonate users for troubleshooting
  - Cannot hold `singer` or `host` roles

- `host`
  - Access to the Host Portal, billing, and owned venues/systems

- `host_manager`
  - Delegated access by a `host`
  - Can manage queues and venues
  - Cannot alter subscriptions or API keys

- `singer`
  - Access to the Singer App, favorites, and request history

- `anonymous`
  - Managed by Better Auth's anonymous plugin
  - Stores history and favorites via session cookies until converted to a registered account

### Seamless Role Bridging

A user role array may contain both `host` and `singer`.

Example:

```text
['host', 'singer']
```

If a logged-in `singer` navigates to the host portal, the UI prompts them to activate their host profile without requiring a second account.

Native iOS and Android apps use Capacitor SDKs for Apple and Google OAuth. The native access token is passed to the Better Auth backend and exchanged for a secure session cookie.

---

# 5. Comprehensive Database Schema (PostgreSQL)

The database blends UUIDs for modern security with `SERIAL` integers (`legacy_id`) for OpenKJ C++ compatibility.

## 5.1 Authentication & Users (Better Auth)

```sql
-- ==========================================
-- 1. AUTHENTICATION & USERS (Better Auth)
-- ==========================================

CREATE TABLE users (
  users_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,

  password TEXT,

  roles TEXT[] DEFAULT '{singer}',

  first_name TEXT,
  last_name TEXT,
  phone_number VARCHAR(20),
  image TEXT,

  is_anonymous BOOLEAN DEFAULT false,

  business_name TEXT,
  business_logo TEXT,
  business_about TEXT,
  singer_about TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

CREATE TABLE sessions (
  sessions_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  users_id UUID NOT NULL REFERENCES users(users_id) ON DELETE CASCADE,

  token TEXT UNIQUE NOT NULL,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  ip_address TEXT,
  user_agent TEXT,

  impersonated_by UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE accounts (
  accounts_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  users_id UUID NOT NULL REFERENCES users(users_id) ON DELETE CASCADE,

  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,

  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,

  password TEXT,

  UNIQUE(provider_id, account_id)
);

CREATE TABLE passkeys (
  passkeys_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT,

  public_key TEXT NOT NULL,

  users_id UUID NOT NULL REFERENCES users(users_id) ON DELETE CASCADE,

  webauthn_user_id TEXT NOT NULL,

  counter INTEGER NOT NULL,

  device_type VARCHAR(255) NOT NULL,

  backed_up BOOLEAN NOT NULL DEFAULT false,

  transports TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verifications (
  verifications_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  identifier TEXT NOT NULL,
  value TEXT NOT NULL,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE two_factors (
  two_factors_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  users_id UUID NOT NULL REFERENCES users(users_id) ON DELETE CASCADE,

  secret TEXT NOT NULL,
  backup_codes TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 5.2 Teams & Billing

```sql
-- ==========================================
-- 2. TEAMS & BILLING
-- ==========================================

CREATE TABLE host_team_members (
  host_team_members_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  host_users_id UUID REFERENCES users(users_id) ON DELETE CASCADE,
  users_id UUID REFERENCES users(users_id) ON DELETE CASCADE,

  role VARCHAR(50) DEFAULT 'host_manager',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(host_users_id, users_id)
);

CREATE TABLE host_profiles (
  users_id UUID PRIMARY KEY REFERENCES users(users_id) ON DELETE CASCADE,

  stripe_customer_id TEXT UNIQUE,

  subscription_status VARCHAR(50) DEFAULT 'inactive'
);

CREATE TABLE subscription_tiers (
  stripe_price_id TEXT PRIMARY KEY,

  name TEXT NOT NULL,

  price_cents INTEGER NOT NULL,

  interval VARCHAR(20) NOT NULL,

  features JSONB,

  active BOOLEAN DEFAULT true,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 5.3 Venues & Shows

```sql
-- ==========================================
-- 3. VENUES & SHOWS
-- ==========================================

CREATE TABLE venues (
  venues_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  external_id VARCHAR(255) UNIQUE,
  external_provider VARCHAR(50),

  name VARCHAR(255) NOT NULL,

  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),

  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip VARCHAR(20) NOT NULL,

  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,

  place_type VARCHAR(100),

  hours_of_operation JSONB,

  is_private BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  created_by UUID REFERENCES users(users_id),
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES users(users_id),

  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(users_id)
);

CREATE TABLE shows (
  shows_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  legacy_id SERIAL UNIQUE,

  venues_id UUID REFERENCES venues(venues_id) ON DELETE CASCADE,

  host_users_id UUID REFERENCES users(users_id) ON DELETE CASCADE,

  show_name VARCHAR(255) NOT NULL,

  slug VARCHAR(255) UNIQUE NOT NULL,

  pin_code VARCHAR(10),

  is_accepting BOOLEAN DEFAULT false,

  active_systems_id UUID,

  serial_counter INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  created_by UUID REFERENCES users(users_id),
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES users(users_id),

  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(users_id)
);
```

## 5.4 Hardware Systems

```sql
-- ==========================================
-- 4. HARDWARE SYSTEMS
-- ==========================================

CREATE TABLE systems (
  systems_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  host_users_id UUID REFERENCES users(users_id) ON DELETE CASCADE,

  api_key VARCHAR(128) UNIQUE NOT NULL,

  system_number INT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  created_by UUID REFERENCES users(users_id),
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES users(users_id),

  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(users_id),

  UNIQUE(host_users_id, system_number)
);
```

## 5.5 Songbook (Live & Shadow)

```sql
-- ==========================================
-- 5. SONGBOOK (Live & Shadow)
-- ==========================================

CREATE TABLE songs (
  songs_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  systems_id UUID REFERENCES systems(systems_id) ON DELETE CASCADE,

  artist VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,

  brand VARCHAR(100),

  search_vector tsvector
);

CREATE INDEX songs_search_idx
  ON songs USING GIN (search_vector);

CREATE INDEX songs_system_idx
  ON songs(systems_id);

CREATE TABLE songs_shadow (
  songs_shadow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  systems_id UUID REFERENCES systems(systems_id) ON DELETE CASCADE,

  artist VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,

  brand VARCHAR(100)
);

CREATE INDEX songs_shadow_system_idx
  ON songs_shadow(systems_id);
```

## 5.6 Requests & Favorites

```sql
-- ==========================================
-- 6. REQUESTS & FAVORITES
-- ==========================================

CREATE TABLE requests (
  requests_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  legacy_id SERIAL UNIQUE,

  systems_id UUID REFERENCES systems(systems_id) ON DELETE CASCADE,

  shows_id UUID REFERENCES shows(shows_id) ON DELETE CASCADE,

  users_id UUID REFERENCES users(users_id) ON DELETE SET NULL,

  singer_name VARCHAR(255) NOT NULL,

  songs_id UUID REFERENCES songs(songs_id) ON DELETE CASCADE,

  key_change INT DEFAULT 0,

  status VARCHAR(50) DEFAULT 'pending',

  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMP WITH TIME ZONE,

  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(users_id)
);

CREATE TABLE favorites (
  favorites_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  users_id UUID REFERENCES users(users_id) ON DELETE CASCADE,

  artist VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(users_id, artist, title)
);
```

---

# 6. API Architecture & Routing

## 6.1 Authentication (`/api/auth/*`)

### Core Authentication

- Better Auth instance running on Node.js
- Handles:
  - Passkeys
  - Magic Links (via Mailjet SDK)
  - SMS/OTP (via Twilio SDK)
  - Password resets

### Native Interoperability

Endpoints accept Google and Apple ID tokens generated from Capacitor native iOS and Android SDKs to initialize cross-platform Better Auth sessions.

### Account Linking

- Automatic email capture from OAuth providers
- If an email already exists:
  - User is prompted to authenticate
  - New provider is linked to the existing `accounts` table row

---

## 6.2 Modern REST API (`/api/v1/*`)

### Endpoints

- `GET /v1/shows/nearby`
  - Executes PostGIS queries against:
    - `venues.is_private = false`
    - `shows.is_accepting = true`

- `POST /v1/shows/:slug/join`
  - Validates `pin_code` for private shows

- `GET /v1/shows/:slug/catalog`
  - Executes PostgreSQL Full Text Search using `search_vector`

- `POST /v1/requests`
  - Submits requests through Better Auth `users_id`
  - Supports anonymous IDs
  - Broadcasts WebSocket updates to the Custom Desktop Agent

- `GET /v1/users/history`
  - Retrieves pending and processed requests
  - Highlights cross-venue matches using the `favorites` table

- `POST /v1/admin/impersonate`
  - Exchanges admin token for a temporary target-user session cookie
  - Logs the `impersonated_by` admin ID

---

## 6.3 Real-Time WebSocket API (`ws://api.singrkaraoke.com`)

Consumed by the Custom Singr Desktop Agent and mobile apps for real-time bidirectional state updates, bypassing polling bottlenecks entirely.

### Events

- `new_request`
- `request_cancelled`
- `direct_message`
- `queue_reordered`

---

## 6.4 Legacy OpenKJ Adapter (`/api/v1/legacy/okj/api.php`)

Masquerades as the defunct PHP server.

### Validation Rules

- Validates `api_key` against the `systems` table
- Payload `system_id` must match `system_number`

### Polling Commands

- `getEntitledSystemCount`
- `getSerial`
- `sacCurVersion`
- `getAlert`

### Venue & Queue Commands

- `getVenues`
- `setAccepting`
- `getRequests`
- `deleteRequest`
- `clearRequests`

Soft deletes (`status = 'processed'`) preserve request history.

### Massive Sync Workflow (`175k+ files`)

#### 1. `clearDatabase`

- Truncates `songs_shadow` for the target `systems_id`

#### 2. `addSongs`

- Receives `1,000`-song chunks
- Bulk inserts into `songs_shadow`
- Pushes a `5-second` debounce timer into Redis using BullMQ

#### 3. Debounce Execution

Redis worker:

1. Drops live songs
2. Swaps `songs_shadow` into `songs`
3. Sets `is_accepting = true`
4. Increments `serial_counter`

---

# 7. Business Logic Constraints

## 7.1 Source of Truth

PostgreSQL is the absolute source of truth.

- Astro marketing pages query `subscription_tiers` directly for pricing
- Stripe webhooks synchronize data into PostgreSQL:
  - `price.updated`
  - `customer.subscription.created`

If Stripe experiences downtime, authorized hosts continue operating normally.

## 7.2 Gap-Fill Provisioning

When generating `system_number` integers for OpenKJ:

1. API scans for missing numerical gaps
2. Example:
   - Existing systems:
     - `1`
     - `3`
   - Generated system:
     - `2`
3. If no gaps exist:
   - Uses `MAX(system_number) + 1`

## 7.3 Venue Protection

### Public Venues

- Created through Google/HERE autocomplete
- Protected from manual host edits

### Private Venues

- Manually created
- Protected by `pin_code`
- Excluded from public singer maps

---

# 8. Environment Configuration (`.env.example`)

```env
# Core Environment
NODE_ENV="production"
PORT=93001

# PostgreSQL Database
DATABASE_URL="postgresql://singr:YOUR_PASSWORD@db-postgres:95432/singr_db?schema=public"

# Redis Cache & Queues (BullMQ)
REDIS_URL="redis://cache-redis:96379"

# Better Auth Configuration
BETTER_AUTH_SECRET="super_secret_generated_string"
BETTER_AUTH_URL="https://api.singrkaraoke.com"

# OAuth Providers
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

APPLE_CLIENT_ID="your_apple_client_id"
APPLE_CLIENT_SECRET="your_apple_client_secret"

# Email & SMS Integrations
MAILJET_API_KEY="your_mailjet_key"
MAILJET_API_SECRET="your_mailjet_secret"

TWILIO_ACCOUNT_SID="your_twilio_sid"
TWILIO_AUTH_TOKEN="your_twilio_token"
TWILIO_VERIFY_SERVICE_SID="your_verify_sid"

# External Integrations
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

GOOGLE_PLACES_API_KEY="AIzaSy..."
# Alternative:
# HERE_API_KEY="your_here_api_key"
```