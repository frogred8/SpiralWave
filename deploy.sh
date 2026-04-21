#!/bin/bash

# .env 파일 로드
if [ -f .env ]; then
    source .env
else
    echo "❌ .env 파일을 찾을 수 없습니다."
    exit 1
fi

# 풀 이미지 경로 생성 (변수 직접 사용)
FULL_IMAGE="${OCI_REGION}.ocir.io/${OCI_NAMESPACE}/${OCI_REPO}:${OCI_VERSION:-latest}"

echo "🚀 [1/4] Docker 이미지 빌드 시작 (Platform: linux/arm64)"
docker buildx build --platform linux/arm64 -t ${FULL_IMAGE} . --load

echo "🔐 [2/4] OCI 레지스트리 로그인 및 푸시"
# DOCKER_USER 조합 시에도 .env 변수를 직접 사용
echo "${OCI_TOKEN}" | docker login ${OCI_REGION}.ocir.io -u "${OCI_NAMESPACE}/${OCI_EMAIL}" --password-stdin
docker push ${FULL_IMAGE}

echo "🚚 [3/4] 원격 서버 접속 및 배포 실행"
ssh -i ${OCI_SSH_KEY} -o StrictHostKeyChecking=no ${OCI_SERVER_USER}@${OCI_SERVER_IP} << EOF
    # 서버 환경에서도 레지스트리 로그인
    echo "${OCI_TOKEN}" | docker login ${OCI_REGION}.ocir.io -u "${OCI_NAMESPACE}/${OCI_EMAIL}" --password-stdin

    echo "Stopping old container..."
    docker stop ${OCI_REPO} || true
    docker rm ${OCI_REPO} || true

    echo "Pulling new image and starting..."
    docker pull ${FULL_IMAGE}
    
    # 컨테이너 이름으로 OCI_REPO 변수 직접 활용
    docker run -d --name ${OCI_REPO} -p 3300:3000 -p 3001:3001 --restart always ${FULL_IMAGE}

    docker image prune -f
    echo "✅ Deployment successful!"
EOF

echo "✅ [4/4] 모든 작업이 완료되었습니다!"
