# 只做 API：镜像里不带站点资源（assets 有 67MB）
FROM node:24-alpine

WORKDIR /app/server
COPY . .

# 数据库落到挂载卷上，容器重建也不丢
ENV PORT=8787 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    NODE_ENV=production
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8787
CMD ["node", "node.js"]
