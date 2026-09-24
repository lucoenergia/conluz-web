FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .

# This is necessary to hotswap variables at container intialization
ARG CONLUZ_API_URL="CONLUZ_API_URL"

# App version (the git tag, e.g. 1.0.12), inlined into the bundle by Vite at
# build time. Passed by .github/workflows/build-and-push-image.yml; local
# builds default to "dev". Unlike CONLUZ_API_URL it is not a runtime
# placeholder: never set CONLUZ_APP_VERSION on the running container, because
# docker/env.sh would rewrite any literal "CONLUZ_APP_VERSION" in the assets.
ARG APP_VERSION=dev
ENV CONLUZ_APP_VERSION=$APP_VERSION

RUN npm run build

FROM nginx:stable-alpine-slim AS production

ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=$APP_VERSION

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

COPY docker/env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
