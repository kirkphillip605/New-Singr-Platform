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
RUN pnpm install --frozen-lockfile || pnpm install

# Copy complete source code
COPY . .

# Generate Prisma client
RUN pnpm --filter @singr/db generate

# Build Next.js production build
RUN pnpm --filter @singr/web-host build

# Stage 2: Runtime image
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy all files from builder
COPY --from=builder /app .

EXPOSE 3000
CMD ["pnpm", "--filter", "@singr/web-host", "start"]
