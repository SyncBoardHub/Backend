FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY schema.sql ./

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "--unhandled-rejections=strict", "src/server.js"]
