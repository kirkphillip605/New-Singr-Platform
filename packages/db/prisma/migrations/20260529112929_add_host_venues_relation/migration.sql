-- CreateTable
CREATE TABLE "host_venues" (
    "host_venues_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "users_id" UUID NOT NULL,
    "venues_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_venues_pkey" PRIMARY KEY ("host_venues_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "host_venues_users_id_venues_id_key" ON "host_venues"("users_id", "venues_id");

-- AddForeignKey
ALTER TABLE "host_venues" ADD CONSTRAINT "host_venues_users_id_fkey" FOREIGN KEY ("users_id") REFERENCES "users"("users_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_venues" ADD CONSTRAINT "host_venues_venues_id_fkey" FOREIGN KEY ("venues_id") REFERENCES "venues"("venues_id") ON DELETE CASCADE ON UPDATE CASCADE;
