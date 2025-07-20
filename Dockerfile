# Stage 1: Build frontend
FROM node:20-slim AS frontend

WORKDIR /app/client

COPY client/package*.json ./
RUN npm install --omit=dev

COPY client/ .
RUN npm run build

# Stage 2: Build backend
FROM node:20-slim

WORKDIR /app

# Copy and install only production dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy backend code
COPY server ./server

# Copy built frontend
COPY --from=frontend /app/client/dist ./client/dist

# Set environment variables if needed
ENV NODE_ENV=production

# Expose port and start server
EXPOSE 3001
CMD ["node", "server/index.js"]
