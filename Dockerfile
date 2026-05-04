FROM node:20-alpine

WORKDIR /app

COPY app/package*.json ./
RUN npm install --only=production

COPY app/src ./src

RUN cp ./src/storage/incidents.json ./src/incidents.default.json

CMD ["node", "src/index.js"]
