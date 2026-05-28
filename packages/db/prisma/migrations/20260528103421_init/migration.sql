-- CreateTable
CREATE TABLE "users" (
    "users_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "roles" TEXT[] DEFAULT ARRAY['singer']::TEXT[],
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" VARCHAR(20),
    "image" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "business_name" TEXT,
    "business_logo" TEXT,
    "business_about" TEXT,
    "singer_about" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("users_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sessions_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "users_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "impersonated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sessions_id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "accounts_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "users_id" UUID NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ,
    "password" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("accounts_id")
);

-- CreateTable
CREATE TABLE "passkeys" (
    "passkeys_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "public_key" TEXT NOT NULL,
    "users_id" UUID NOT NULL,
    "webauthn_user_id" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "device_type" VARCHAR(255) NOT NULL,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "transports" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("passkeys_id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "verifications_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("verifications_id")
);

-- CreateTable
CREATE TABLE "two_factors" (
    "two_factors_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "users_id" UUID NOT NULL,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factors_pkey" PRIMARY KEY ("two_factors_id")
);

-- CreateTable
CREATE TABLE "host_team_members" (
    "host_team_members_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "host_users_id" UUID NOT NULL,
    "users_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'host_manager',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_team_members_pkey" PRIMARY KEY ("host_team_members_id")
);

-- CreateTable
CREATE TABLE "host_profiles" (
    "users_id" UUID NOT NULL,
    "stripe_customer_id" TEXT,
    "subscription_status" VARCHAR(50) NOT NULL DEFAULT 'inactive',

    CONSTRAINT "host_profiles_pkey" PRIMARY KEY ("users_id")
);

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "stripe_price_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "interval" VARCHAR(20) NOT NULL,
    "features" JSONB,
    "active" BOOLEAN DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("stripe_price_id")
);

-- CreateTable
CREATE TABLE "venues" (
    "venues_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "external_id" VARCHAR(255),
    "external_provider" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "address1" VARCHAR(255) NOT NULL,
    "address2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "zip" VARCHAR(20) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "place_type" VARCHAR(100),
    "hours_of_operation" JSONB,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("venues_id")
);

-- CreateTable
CREATE TABLE "shows" (
    "shows_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "legacy_id" SERIAL NOT NULL,
    "venues_id" UUID,
    "host_users_id" UUID,
    "show_name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "pin_code" VARCHAR(10),
    "is_accepting" BOOLEAN NOT NULL DEFAULT false,
    "active_systems_id" UUID,
    "serial_counter" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "shows_pkey" PRIMARY KEY ("shows_id")
);

-- CreateTable
CREATE TABLE "systems" (
    "systems_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "host_users_id" UUID,
    "api_key" VARCHAR(128) NOT NULL,
    "system_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMPTZ,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("systems_id")
);

-- CreateTable
CREATE TABLE "songs" (
    "songs_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "systems_id" UUID,
    "artist" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(100),
    "search_vector" tsvector,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("songs_id")
);

-- CreateTable
CREATE TABLE "songs_shadow" (
    "songs_shadow_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "systems_id" UUID,
    "artist" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(100),

    CONSTRAINT "songs_shadow_pkey" PRIMARY KEY ("songs_shadow_id")
);

-- CreateTable
CREATE TABLE "requests" (
    "requests_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "legacy_id" SERIAL NOT NULL,
    "systems_id" UUID,
    "shows_id" UUID,
    "users_id" UUID,
    "singer_name" VARCHAR(255) NOT NULL,
    "songs_id" UUID,
    "key_change" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("requests_id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "favorites_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "users_id" UUID,
    "artist" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("favorites_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "host_team_members_host_users_id_users_id_key" ON "host_team_members"("host_users_id", "users_id");

-- CreateIndex
CREATE UNIQUE INDEX "host_profiles_stripe_customer_id_key" ON "host_profiles"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "venues_external_id_key" ON "venues"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "shows_legacy_id_key" ON "shows"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "shows_slug_key" ON "shows"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "systems_api_key_key" ON "systems"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "systems_host_users_id_system_number_key" ON "systems"("host_users_id", "system_number");

-- CreateIndex
CREATE INDEX "songs_system_idx" ON "songs"("systems_id");

-- CreateIndex
CREATE INDEX "songs_shadow_system_idx" ON "songs_shadow"("systems_id");

-- CreateIndex
CREATE UNIQUE INDEX "requests_legacy_id_key" ON "requests"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_users_id_artist_title_key" ON "favorites"("users_id", "artist", "title");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_team_members" ADD CONSTRAINT "host_team_members_host_users_id_fkey" FOREIGN KEY ("host_users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_team_members" ADD CONSTRAINT "host_team_members_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_profiles" ADD CONSTRAINT "host_profiles_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_venues_id_fkey" FOREIGN KEY ("venues_id") REFERENCES "venues"("venues_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_host_users_id_fkey" FOREIGN KEY ("host_users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shows" ADD CONSTRAINT "shows_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_host_users_id_fkey" FOREIGN KEY ("host_users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systems" ADD CONSTRAINT "systems_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_systems_id_fkey" FOREIGN KEY ("systems_id") REFERENCES "systems"("systems_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs_shadow" ADD CONSTRAINT "songs_shadow_systems_id_fkey" FOREIGN KEY ("systems_id") REFERENCES "systems"("systems_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_systems_id_fkey" FOREIGN KEY ("systems_id") REFERENCES "systems"("systems_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_shows_id_fkey" FOREIGN KEY ("shows_id") REFERENCES "shows"("shows_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_songs_id_fkey" FOREIGN KEY ("songs_id") REFERENCES "songs"("songs_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("users_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;
