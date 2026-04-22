# Stage 1: Build React App
FROM node:20-slim AS builder

WORKDIR /app

# Add build arguments
ARG REACT_APP_API_URL=http://localhost:8080
ARG REACT_APP_GOOGLE_CLIENT_ID=600569151673-5m5g8c4desencf7jn0d04j3b5t9uuhkh.apps.googleusercontent.com

# Set them as environment variables for the build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
