FROM node:20-alpine3.18

ENV USER=xgov-software-community
ENV UID=1001
ENV GID=1001

RUN mkdir -p /app
WORKDIR /app

RUN addgroup -g 1001 "$USER"
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

USER 1001

EXPOSE 8081

CMD [ "npx", "@11ty/eleventy", "--serve", "--port=8081" ]
