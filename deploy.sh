#!/bin/bash

# .env 파일 로드
if [ -f .env ]; then
    source .env
else
    echo "❌ .env 파일을 찾을 수 없습니다."
    exit 1
fi

# 풀 이미지 경로 생성 (변수 직접 사용)
OLD_CONTAINER_NAME="${OCI_REPO}${OLD_VERSION:+_${OLD_VERSION}}"
NEW_CONTAINER_NAME="${OCI_REPO}${NEW_VERSION:+_${NEW_VERSION}}"
FULL_IMAGE="${OCI_REGION}.ocir.io/${OCI_NAMESPACE}/${NEW_CONTAINER_NAME}:latest"
DEPLOY_ID="${DEPLOY_ID:-${NEW_VERSION:-latest}}"
DEPLOY_TYPE="${DEPLOY_TYPE:-stable}"
DEPLOY_TITLE="${DEPLOY_TITLE:-${DEPLOY_ID}}"
HOST_PORT="${HOST_PORT:-3300}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
PUBLIC_URL="${PUBLIC_URL:-http://${OCI_SERVER_IP}:${HOST_PORT}}"
DEPLOYMENTS_DIR="${DEPLOYMENTS_DIR:-~}"
DEPLOYMENTS_FILE="${DEPLOYMENTS_FILE:-${DEPLOYMENTS_DIR}/deployments.json}"
BRANCH_NAME="${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
DEPLOYMENTS_SOURCE_FILE="${DEPLOYMENTS_SOURCE_FILE:-deployments.json}"

echo "OCI Container:$OLD_CONTAINER_NAME -> $NEW_CONTAINER_NAME"
echo "OCI Image: $FULL_IMAGE"
echo "OCI Port: $HOST_PORT -> $CONTAINER_PORT"

if [ ! -f "${DEPLOYMENTS_SOURCE_FILE}" ]; then
    echo "❌ deployments.json 파일을 찾을 수 없습니다: ${DEPLOYMENTS_SOURCE_FILE}"
    exit 1
fi

echo "🚀 [1/5] Docker 이미지 빌드 시작 (Platform: linux/arm64)"
docker buildx build --platform linux/arm64 --build-arg BUILD_BRANCH="${BRANCH_NAME}" -t ${FULL_IMAGE} . --load

echo "🔐 [2/5] OCI 레지스트리 로그인 및 푸시"
# DOCKER_USER 조합 시에도 .env 변수를 직접 사용
echo "${OCI_TOKEN}" | docker login ${OCI_REGION}.ocir.io -u "${OCI_NAMESPACE}/${OCI_EMAIL}" --password-stdin
docker push ${FULL_IMAGE}

echo "📤 [3/5] 원격 서버 deployments.json 업로드"
ssh -i ${OCI_SSH_KEY} -o StrictHostKeyChecking=no ${OCI_SERVER_USER}@${OCI_SERVER_IP} "mkdir -p '${DEPLOYMENTS_DIR}'"
scp -i ${OCI_SSH_KEY} -o StrictHostKeyChecking=no "${DEPLOYMENTS_SOURCE_FILE}" "${OCI_SERVER_USER}@${OCI_SERVER_IP}:${DEPLOYMENTS_FILE}"

echo "🚚 [4/5] 기존 버전 정지 및 배포된 버전 실행"
ssh -i ${OCI_SSH_KEY} -o StrictHostKeyChecking=no ${OCI_SERVER_USER}@${OCI_SERVER_IP} << EOF
    # 서버 환경에서도 레지스트리 로그인
    echo "${OCI_TOKEN}" | docker login ${OCI_REGION}.ocir.io -u "${OCI_NAMESPACE}/${OCI_EMAIL}" --password-stdin

    set -e

    DEPLOYMENTS_DIR="${DEPLOYMENTS_DIR}"
    DEPLOYMENTS_FILE="${DEPLOYMENTS_FILE}"

    # 컨테이너 이름이 동일하면 main 브랜치로 간주하여 기존 컨테이너 정지
    # 혹은 버전이 명시적으로 존재한다면 old 컨테이너 정지
    if [[ "${OLD_CONTAINER_NAME}" == "${NEW_CONTAINER_NAME}" || -n "${OLD_VERSION}" ]]; then
        echo "Stopping old container... ${OLD_CONTAINER_NAME}"
        docker stop ${OLD_CONTAINER_NAME} || true
        docker rm ${OLD_CONTAINER_NAME} || true
    fi

    echo "Pulling new image and starting..."
    docker pull ${FULL_IMAGE}
    
    docker run -d \
        --name ${NEW_CONTAINER_NAME} \
        -p ${HOST_PORT}:${CONTAINER_PORT} \
        --restart always \
        -e DEPLOYMENTS_FILE=/app/deployments.json \
        -e OCI_SERVER_SECRET_KEY="${OCI_SERVER_SECRET_KEY:-}" \
        -v ${DEPLOYMENTS_FILE}:"/app/deployments.json:ro" \
        ${FULL_IMAGE}

    echo "Waiting for health check..."
    HEALTH_OK=0
    for i in \$(seq 1 30); do
        if docker exec ${NEW_CONTAINER_NAME} node -e "const http=require('node:http'); const req=http.get('http://127.0.0.1:${CONTAINER_PORT}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1));" >/dev/null 2>&1; then
            HEALTH_OK=1
            break
        fi
        sleep 1
    done

    if [ "\${HEALTH_OK}" != "1" ]; then
        echo "❌ Health check failed. deployments.json was not updated."
        docker logs ${NEW_CONTAINER_NAME} --tail 80 || true
        exit 1
    fi

    docker image prune -f
    echo "✅ Deployment successful!"
EOF

echo "✅ [5/5] 모든 작업이 완료되었습니다!"
