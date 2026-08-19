# ===== Stage 1: 安装依赖 =====
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ===== Stage 2: 构建 =====
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# 注意：Supabase 变量名不再用 NEXT_PUBLIC_ 前缀（lib/supabase.ts 运行时读取
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY），
# 由 CloudBase 作为运行时环境变量注入即可，无需构建参数。

RUN npm run build

# ===== Stage 3: 运行 =====
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# 关键：standalone 默认监听 localhost，必须改成 0.0.0.0 容器外才能访问
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
# standalone 产物不会自动带上 .next/static，必须手动复制，否则 CSS/JS 404
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
