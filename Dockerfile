FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# Vite only inlines import.meta.env.VITE_* values that exist in the build
# environment. Dockerfile ENV substitution resolves ARGs (and earlier ENVs),
# NOT the host shell, so the keys must be passed explicitly as --build-arg.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN bun run build

FROM nginx:alpine
# Upstream Supabase API for the same-origin proxy. Bake it in at build time so
# proxy_pass is static (no nginx resolver needed). Defaults to the local CLI.
ARG SUPABASE_PROXY_PASS=http://localhost:54321
ENV SUPABASE_PROXY_PASS=$SUPABASE_PROXY_PASS
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY --from=build /app/dist/client /usr/share/nginx/html
RUN envsubst '${SUPABASE_PROXY_PASS}' \
    < /etc/nginx/conf.d/default.conf.template \
    > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
