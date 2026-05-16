FROM node:20-alpine AS deps
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY server ./server
COPY shared ./shared
WORKDIR /app/server
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/server/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/server/src/server.js"]
