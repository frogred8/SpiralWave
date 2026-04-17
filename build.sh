npm run build
docker buildx build --platform linux/arm64 -t spiralwave . --load
