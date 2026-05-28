# =============================================
# Singr Web Host Portal — Next.js Production Build
# =============================================

# Stage 1: Build Next.js application
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy lockfile and workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy package manifests
COPY apps/web-host/package.json ./apps/web-host/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store || pnpm install --store-dir /pnpm/store

# Copy complete source code
COPY . .

# Copy root .env to apps/web-host/.env for Next.js build configuration
RUN cp .env apps/web-host/.env || true

# Generate Prisma client
RUN pnpm --filter @singr/db generate

# Build Next.js production build
RUN --mount=type=cache,id=next-host-cache,target=/app/apps/web-host/.next/cache pnpm --filter @singr/web-host build

# Stage 2: Runtime image
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy all files from builder
COPY --from=builder /app .

EXPOSE 3011
CMD ["pnpm", "--filter", "@singr/web-host", "start"]
