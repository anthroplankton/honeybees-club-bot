# builder
FROM node:17.0-alpine AS builder

WORKDIR /builder

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --only=dev

COPY . .

run npm run build

# app
FROM node:17.0-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install

COPY ormconfig.js .

COPY --from=builder ./builder/dist/ ./dist/

CMD ["npm", "run", "bot"]