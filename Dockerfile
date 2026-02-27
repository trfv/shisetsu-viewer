FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/scraper/ ./packages/scraper/

RUN npm ci -w @shisetsu-viewer/scraper --ignore-scripts

# Install Chromium and its system dependencies
RUN npx playwright install --with-deps chromium

WORKDIR /app/packages/scraper

ENTRYPOINT ["node", "scripts/run.ts"]
