FROM node:16 as builder

WORKDIR /app

COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./tsconfig.json ./

RUN npm install -g npm
RUN npm install discord/erlpack
RUN npm install

COPY . .

FROM node:16-stretch-slim

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV DISCORD_TOKEN=''
ENV DISCORD_CLIENT_ID=''
ENV DISCORD_PLAYING_GAME=''
ENV DB_HOST=''
ENV DB_PORT=''
ENV DB_USER=''
ENV DB_PASSWORD=''
ENV DB_NAME=''
ENV DB_SSL=''
ENV DB_SYNCHRONIZE=true

CMD ["npm", "run", "serve"]
