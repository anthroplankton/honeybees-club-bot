# builder
FROM node:17.0-alpine AS builder

WORKDIR /builder

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production=false

COPY . .

RUN npm run build

# app
FROM node:17.0-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --ignore-scripts
RUN npm rebuild

COPY ormconfig.js .

COPY --from=builder ./builder/dist/ ./dist/

CMD ["npm", "run", "start"]