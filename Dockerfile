FROM node:22-bookworm-slim

# Install Python and required system packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python3 -m venv /opt/venv

# Make Python virtual environment the default
ENV PATH="/opt/venv/bin:$PATH"

# Application directory
WORKDIR /app

# Copy package files first for better Docker caching
COPY package*.json ./

# Install Node dependencies
RUN npm ci

# Copy Python requirements
COPY requirements.txt ./

# Install Python ML dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy complete application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Render provides PORT at runtime
ENV NODE_ENV=production

EXPOSE 3000

# Start Next.js
CMD ["sh", "-c", "npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
