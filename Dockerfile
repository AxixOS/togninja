# TogNinja — production container image.
# One long-running Express service that serves the API AND the built React app
# (server/vite.ts serveStatic reads /app/dist; it activates only when NODE_ENV=production
# and PORT are set — both guaranteed below / by the host).
#
# single stage; optimize to multi-stage + slim later (see MASTER_EXECUTION_PLAN.md)
FROM node:20-bookworm

# Use the system Chromium for the prerender step (per-route static HTML for
# crawlers/social scrapers) and tell puppeteer to skip its own ~150MB download.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

# Chromium + the runtime libraries headless Chrome needs on Debian bookworm.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium fonts-liberation libnss3 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
      libdrm2 libgbm1 libgtk-3-0 libasound2 libxkbcommon0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install ALL deps: build needs vite; runtime needs tsx; bootstrap needs drizzle-kit (a devDep).
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

# App source (respects .dockerignore — node_modules, .git, dist, .env* are excluded).
COPY . .

# Build the client bundle to /app/dist. Attempt prerendering (per-route static HTML
# for SEO / social previews); if prerender fails for any reason, fall back to a
# plain build so the deploy can never break on it.
RUN npm run heroku-postbuild || (echo "⚠️  prerender build failed — falling back to standard build" && npm run build)

# Runtime: production mode. Host (Render/Heroku) injects PORT; default 3001 for local runs.
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Auto-provision the schema on first boot ONLY when AUTO_INIT_SCHEMA is set
# (opt-in; a no-op otherwise), then start. `npm start` = tsx server/index.ts.
CMD ["sh", "-c", "node scripts/ensure-schema.mjs; npm start"]
