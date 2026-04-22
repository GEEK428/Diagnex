# Use Node.js LTS as base
FROM node:20-slim AS builder

# Install system dependencies for Prisma
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Final stage
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app /app

# Expose backend port
EXPOSE 8080

# Start command
CMD ["npm", "start"]
