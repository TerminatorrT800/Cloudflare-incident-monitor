FROM node:20-alpine

WORKDIR /app

COPY app/package*.json ./
RUN npm install --only=production

COPY app/src ./src

CMD ["node", "src/index.js"]
