# =============================================
# Singr API Node — Multi-stage Dockerfile
# =============================================

# Stage 1: deps — install all dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy all package.json files for dependency resolution
COPY apps/api-node/package.json ./apps/api-node/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Configure pnpm to hoist node_modules (creates standard files instead of store symlinks)
RUN pnpm config set node-linker hoisted

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store || pnpm install --store-dir /pnpm/store

# Stage 2: builder — copy source and build
FROM deps AS builder
WORKDIR /app

# Copy all source code
COPY . .

# Generate Prisma client
RUN pnpm --filter @singr/db generate || true

# Stage 3: runner — minimal production image
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
RUN addgroup -g 1001 -S appgroup && adduser -S -u 1001 -G appgroup appuser
WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app .

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3001/health || exit 1

CMD ["npx", "tsx", "apps/api-node/src/index.ts"]
