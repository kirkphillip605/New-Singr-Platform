# =============================================
# Singr Mobile Singer App — Placeholder Dockerfile
# Will be replaced with Framework7-specific build in Phase 7
# =============================================

FROM nginx:alpine AS runner
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
