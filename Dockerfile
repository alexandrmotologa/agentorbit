# Multi-stage Dockerfile for AgentOrbit

# Stage 1: Build the React 19 Frontend
FROM node:22-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Build the Fastify Server
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DEMO_MODE=true
ENV DATABASE_PATH=/data/agentorbit.db

# Install SQLite runtime tools if needed
RUN apk add --no-cache python3 make g++

# Copy server files and production deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

COPY --from=server-builder /app/server/dist ./dist
# Copy static web build
COPY --from=web-builder /app/web/dist ./public

# Data directory for SQLite WAL database
RUN mkdir -p /data

EXPOSE 8080

CMD ["node", "dist/index.js"]
