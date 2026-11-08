# Stage 1: Build Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install Server Dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend assets for self-contained serving
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["node", "server/src/server.js"]

