# Stage 1: Build frontend
FROM node:20-slim AS frontend

WORKDIR /app/client

# Copy package.json and install ALL dependencies (including dev)
COPY client/package*.json ./
RUN npm install  # DO NOT omit dev dependencies

# Copy source files
COPY client/ .

# Build using Vite
RUN npm run build


# Stage 2: Build backend + serve frontend
FROM node:20-slim

WORKDIR /app

# Copy and install only production dependencies for backend
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy backend source
COPY server ./server

# Copy frontend build output from previous stage
COPY --from=frontend /app/client/dist ./client/dist

# Set environment to production
ENV NODE_ENV=production

# Expose the port your server listens on
EXPOSE 3001

# Start the server
CMD ["node", "server/index.js"]
