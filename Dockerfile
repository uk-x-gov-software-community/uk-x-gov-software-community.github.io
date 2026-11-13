FROM node:22-alpine

ENV APP_USER=xgov-software-community \
    APP_UID=1001 \
    APP_GID=1001

RUN addgroup -g "$APP_GID" "$APP_USER" \
    && adduser -D -H -h /app -G "$APP_USER" -u "$APP_UID" "$APP_USER" \
    && mkdir -p /app \
    && chown "$APP_UID:$APP_GID" /app

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=1001:1001 . .

USER 1001:1001

EXPOSE 8081

CMD ["npx", "@11ty/eleventy", "--serve", "--port=8081"]