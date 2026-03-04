# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "server/index.js"]
