FROM node:22-bookworm-slim

# =========================================================
# System dependencies
# =========================================================

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*


# =========================================================
# Python virtual environment
# =========================================================

RUN python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"


# =========================================================
# Application
# =========================================================

WORKDIR /app


# =========================================================
# Node dependencies
# =========================================================

COPY package*.json ./

RUN npm ci


# =========================================================
# Python ML dependencies
# =========================================================

COPY requirements.txt ./

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# =========================================================
# Application source
# =========================================================

COPY . .


# =========================================================
# Prisma
#
# Prisma 7 loads prisma.config.ts during generate.
# The config requires DIRECT_URL, but the real database
# URL must NEVER be stored in the Docker image.
#
# A temporary build-only URL is used here.
# Render's real DIRECT_URL environment variable will
# override this at runtime.
# =========================================================

RUN DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres" \
    npx prisma generate


# =========================================================
# Next.js production build
# =========================================================

RUN DIRECT_URL="postgresql://postgres:postgres@localhost:5432/postgres" \
    npm run build


# =========================================================
# Runtime
# =========================================================

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npm start -- -H 0.0.0.0 -p ${PORT:-3000}"]
