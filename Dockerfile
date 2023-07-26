FROM node:20-alpine3.18

ENV USER=xgov-software-community
ENV UID=1001
ENV GID=1001

RUN mkdir -p /app
WORKDIR /app

RUN addgroup -g "$UID" "$USER"
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "$(pwd)" \
    --ingroup "$USER" \
    --no-create-home \
    --uid "$UID" \
    "$USER"

COPY . /app/
RUN npm install

RUN chown -R "$UID":"$GID" /app

USER "$UID"

EXPOSE 8081

CMD [ "npx", "@11ty/eleventy", "--serve", "--port=8081" ]
