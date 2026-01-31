FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./
RUN rm -rf node_modules package-lock.json && npm install

COPY . .
