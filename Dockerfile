# Use Node.js 22 (required for built-in node:sqlite support)
FROM node:22-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Copy application source
COPY server.js ./
COPY public/ ./public/

# Create a directory for the SQLite database (will be mounted as a volume)
RUN mkdir -p /app/data

# Set the DB path to the persistent volume directory
ENV DB_PATH=/app/data/mcq.db

# Expose the app port
EXPOSE 3000

# Run with the experimental-sqlite flag (required for node:sqlite)
CMD ["node", "--experimental-sqlite", "server.js"]
