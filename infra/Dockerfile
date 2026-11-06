FROM node:26.12.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && mkdir -p /var/lib/opsledger-files && chown node:node /var/lib/opsledger-files && chmod 700 /var/lib/opsledger-files
USER node
ENV STORAGE_DIR=/var/lib/opsledger-files
CMD ["node", "--experimental-strip-types", "apps/api/src/server.ts"]
