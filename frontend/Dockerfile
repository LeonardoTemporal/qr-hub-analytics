# ─────────────────────────────────────────────────────────────────────────────
# QR-Hub Analytics – Frontend Dockerfile (modo standalone)
# Multi-stage build para imagen final ultra-liviana
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencias ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* ./
# --omit=dev installs only production dependencies in the deps stage.
# devDependencies (TypeScript types, ESLint, etc.) are only needed in the
# builder stage where node_modules from this stage are copied.
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiamos las dependencias del stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno en build-time (se sobreescriben desde Docker Compose)
ARG NEXT_PUBLIC_GA4_ID
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_GA4_ID=$NEXT_PUBLIC_GA4_ID \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: Runner (imagen final) ────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Usuario sin privilegios para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Artefactos de output standalone + archivos estáticos
COPY --from=builder /app/public ./public

# Ajustar permisos del directorio de caché de Next.js antes de copiar
RUN mkdir -p .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
