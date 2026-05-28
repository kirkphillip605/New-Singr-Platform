# =============================================
# Singr Web Marketing — Astro Production Build
# =============================================

# Stage 1: Build Astro marketing site
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy lockfile and workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy package config manifests
COPY apps/web-marketing/package.json ./apps/web-marketing/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy complete source code
COPY . .

# Copy root .env to apps/web-marketing/.env for Astro build configuration
RUN cp .env apps/web-marketing/.env || true

# Generate Prisma client
RUN pnpm --filter @singr/db generate

# Run build compilation
RUN pnpm --filter @singr/web-marketing build

# Stage 2: Serve static bundle via Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web-marketing/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
