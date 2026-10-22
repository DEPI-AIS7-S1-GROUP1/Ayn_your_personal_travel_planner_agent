# ==============================================================================
# Ayn Travel Planner - Frontend Containerfile (Multi-Stage Build)
# ==============================================================================

# Stage 1: Build the React + Vite static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors first for Docker cache optimization
COPY package*.json ./
RUN npm ci || npm install

# Copy frontend source files
COPY . .

# Set API Base URL at build time (defaults to /api which is proxied by Nginx)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production bundle
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine

# Copy custom Nginx configuration with SPA routing and API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
