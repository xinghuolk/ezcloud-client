# 前端 Dockerfile - 多阶段构建优化镜像大小
# Stage 1: Build stage
FROM node:20-alpine AS builder

# 配置Alpine镜像源（使用阿里云镜像加速）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 设置工作目录
WORKDIR /app

# 复制根目录的package文件（workspaces配置）
COPY package*.json ./

# 复制client目录的package文件
COPY client/package*.json ./client/

# 安装workspaces依赖
RUN npm ci

# 复制client源代码
COPY client/ ./client/

# 设置工作目录到client
WORKDIR /app/client

# 接收构建参数
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_BASE_URL=$VITE_WS_BASE_URL

# 构建应用
RUN npm run build

# Stage 2: Production stage
FROM nginx:1.21-alpine AS production

# 配置Alpine镜像源（使用阿里云镜像加速）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装必要工具（健康检查用）
RUN apk add --no-cache curl

# 复制自定义nginx配置
COPY client/nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/client/dist /usr/share/nginx/html

# 检查并创建非root用户（如果不存在）
RUN if ! getent group nginx >/dev/null 2>&1; then \
        addgroup -g 1001 -S nginx; \
    fi && \
    if ! getent passwd nginx >/dev/null 2>&1; then \
        adduser -S nginx -u 1001 -G nginx; \
    fi

# 设置权限
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# 修改nginx配置为非root运行
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# 使用非root用户运行
USER nginx

# 启动nginx
CMD ["nginx", "-g", "daemon off;"] 