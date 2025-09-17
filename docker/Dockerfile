FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# This is necessary to hotswap variables at container intialization
ARG CONLUZ_API_URL="CONLUZ_API_URL"

RUN npm run build

FROM nginx:stable-alpine-slim AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY docker/env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
