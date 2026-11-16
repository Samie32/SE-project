FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_OIDC_AUTHORITY=http://localhost:8180/realms/clinic
ARG VITE_OIDC_CLIENT_ID=clinic-web
# Cờ năng lực backend (chỉ bật khi endpoint tương ứng đã triển khai).
ARG VITE_BACKEND_CHECKIN=true
ARG VITE_BACKEND_QUEUE=true
ARG VITE_BACKEND_PROGRESS=true
ARG VITE_BACKEND_CLINICAL=true
ARG VITE_BACKEND_TELEHEALTH=true
ARG VITE_BACKEND_AUDIT=true
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY \
    VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID \
    VITE_BACKEND_CHECKIN=$VITE_BACKEND_CHECKIN \
    VITE_BACKEND_QUEUE=$VITE_BACKEND_QUEUE \
    VITE_BACKEND_PROGRESS=$VITE_BACKEND_PROGRESS \
    VITE_BACKEND_CLINICAL=$VITE_BACKEND_CLINICAL \
    VITE_BACKEND_TELEHEALTH=$VITE_BACKEND_TELEHEALTH \
    VITE_BACKEND_AUDIT=$VITE_BACKEND_AUDIT
RUN npm run build

FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
