FROM node:24-alpine AS client-build
WORKDIR /build
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/src/ ./src/
COPY --from=client-build /build/dist/ /app/client/dist/
USER node
EXPOSE 3001
CMD ["node", "src/index.js"]
