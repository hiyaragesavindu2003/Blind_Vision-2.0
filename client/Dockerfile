FROM node:20-alpine AS build
WORKDIR /app
COPY client/package.json ./client/
COPY shared ./shared
WORKDIR /app/client
RUN npm install
COPY client ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
