# =============================================
# Singr Web Marketing — Placeholder Dockerfile
# Will be replaced with Astro-specific build in Phase 7
# =============================================

FROM nginx:alpine AS runner
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
