FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node --from=build /app/dist/standalone ./
USER node
EXPOSE 3000
CMD ["node", "server.js"]
