# =============================================
# Singr Mobile App — React SPA Production Build
# =============================================

# Stage 1: Build React/Framework7 SPA
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy lockfile and workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy package config manifests
COPY apps/mobile-singer/package.json ./apps/mobile-singer/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store || pnpm install --store-dir /pnpm/store

# Copy complete source code
COPY . .

# Copy root .env to apps/mobile-singer/.env for Vite build configuration
RUN cp .env apps/mobile-singer/.env || true

# Generate Prisma client
RUN pnpm --filter @singr/db generate

# Run production bundler
RUN pnpm --filter @singr/mobile-singer build

# Stage 2: Serve static files via Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/mobile-singer/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
