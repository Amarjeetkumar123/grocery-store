# The grocery store API. Settings (.env) are given when the container starts
# (see compose.yaml) and are never copied into the image.
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
# Supabase's public certificate authority, for checking the database's TLS certificate.
COPY supabase-ca.crt ./

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://localhost:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "src/server.js"]
