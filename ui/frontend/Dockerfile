# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Install curl for health checks

RUN apk add --no-cache curl

# Copy custom nginx configuration

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Expose port 80

EXPOSE 80

# Health check

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \

  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
