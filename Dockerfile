# Build stage
FROM node:24.12.0-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:24.12.0-alpine AS runner

# Set working directory
WORKDIR /app

# Install su-exec for running as non-root user with dynamic PUID/PGID
RUN apk add --no-cache su-exec

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]

