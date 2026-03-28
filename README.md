
# Automatic Update - 20260328_1152

## Raw User Feedback
```

        수집한 자원의 도감 및 상세 정보 확인 기능 (서버 요청 없이도 가능)
        블랙홀 주변을 도는 위성 추가. 위성 주변부의 중력으로 자원 수집 가능 
    
```

## Gemini AI Plan
제공해주신 요구사항을 바탕으로 영문 번역, 분석, 그리고 코드 생성을 위한 최종 프롬프트를 정리해 드립니다. 이 프롬프트는 `@apps/client`와 `@apps/server` 구조를 이해하는 AI 모델에게 최적화되어 있습니다.

---

### 1. 요구사항 영문 번역 (English Translation)

1.  **Resource Encyclopedia & Detailed Info:** 
    *   Implement an encyclopedia (codex) and detailed information view for collected resources.
    *   Requirement: Must be accessible without server requests (local-first/offline support).
2.  **Orbiting Satellites & Gravity-based Collection:** 
    *   Add satellites that orbit around a black hole.
    *   Requirement: Resources can be collected using the gravitational pull exerted by these satellites' peripheral areas.

---

### 2. 분석 및 정리 (Analysis & Breakdown)

#### **A. 클라이언트 (@apps/client)**
*   **데이터 관리:** 서버 요청 없이 도감을 보여주기 위해 리소스 정적 데이터(이름, 설명, 이미지 경로 등)를 클라이언트 사이드에 캐싱하거나 정적 JSON 파일로 관리해야 함. 유저의 '수집 여부'만 로컬 상태(또는 초기 로드된 데이터)에서 확인.
*   **UI/UX:** 도감 리스트 뷰 및 상세 팝업/페이지 구현.
*   **물리/로직:** 
    *   블랙홀 중심의 위성 궤도(Orbit) 애니메이션/물리 구현.
    *   위성 주변에 `GravityField` 영역 설정.
    *   영역 내 자원(Resource) 존재 여부를 체크하여 위성 방향으로 끌어당기는 로직 필요.

#### **B. 서버 (@apps/server)**
*   **데이터 스키마:** 자원(Resource) 마스터 데이터 정의 및 유저별 수집 목록(Collection) API.
*   **동기화:** 위성이 자원을 수집했을 때 서버에 수집 결과를 전달하여 DB 업데이트.

---

### 3. 코드 생성을 위한 프롬프트 (Final Prompt)

아래는 이 내용을 바탕으로 코드 생성을 요청할 때 사용할 수 있는 프롬프트입니다.

```markdown
# Role
You are an expert Full-stack Game Developer. Your task is to implement new features in a monorepo structure consisting of `@apps/client` (React/Three.js or similar) and `@apps/server` (Node.js/TypeScript).

# Requirements

## 1. Local-first Resource Encyclopedia
- **Feature**: A UI system to browse collected resources and their detailed information.
- **Offline Support**: Static data (resource metadata) must be stored on the client-side to allow viewing without frequent server requests. Only the "unlock status" should be synced from the user's progress.
- **Tasks**:
  - Define a resource data schema/JSON in `@apps/client`.
  - Create a UI component for the Encyclopedia list and Detail view.
  - Implement a state management logic to filter "discovered" vs "unknown" resources.

## 2. Satellite Orbit & Gravity Collection System
- **Feature**: Satellites orbiting a central Black Hole that automatically collect nearby resources.
- **Physics/Logic**:
  - Implement satellite orbital movement logic around the Black Hole coordinates.
  - Define a "Gravity Zone" (radius) around each satellite.
  - If a resource object enters the Gravity Zone, it should be pulled toward the satellite and "collected" upon contact.
- **Integration**:
  - When a resource is collected by a satellite, notify `@apps/server` to update the user's inventory/encyclopedia status.

# Technical Specifications
- **Monorepo Structure**: @apps/client, @apps/server.
- **Language**: TypeScript.
- **Communication**: Use a REST API or WebSocket to sync collection events from client to server.
- **Optimization**: Ensure the gravity calculation (distance checking) is performance-optimized for multiple resources.

# Request
Please provide the following:
1. Data structures/interfaces for Resources in both client and server.
2. The core logic for the Satellite's orbital motion and gravity-based resource detection in `@apps/client`.
3. The Encyclopedia UI logic that works offline using the predefined resource data.
4. The API endpoint in `@apps/server` to handle resource collection events.
```

---

### 활용 팁:
*   사용 중인 특정 프레임워크(예: **React, Three.js, NestJS, Prisma** 등)가 있다면 프롬프트의 `# Technical Specifications` 섹션에 추가하면 더 정확한 코드를 얻을 수 있습니다.
*   도감 데이터의 경우, 초기 로딩 시 서버에서 한 번 내려받고 이후에는 로컬 스토리지를 사용하는 방식을 제안할 수도 있습니다.
        