
# Automatic Update - 20260328_1300

## Raw User Feedback
```

        수집한 자원의 도감 및 상세 정보 확인 기능 (서버 요청 없이도 가능)
        블랙홀 주변을 도는 위성 추가. 위성 주변부의 중력으로 자원 수집 가능 
    
```

## Gemini AI Plan
제시해주신 요구사항을 바탕으로 번역, 분석 및 코드 생성을 위한 상세 프롬프트 계획을 정리해 드립니다.

---

### 1. 요구사항 번역 및 분석 (Translation & Analysis)

#### **영문 번역 (English Translation)**
1. **Resource Encyclopedia:** "Implement a collection encyclopedia and detailed information system for acquired resources (must be accessible offline without server requests)."
2. **Orbital Satellites & Gravity Collection:** "Add satellites orbiting the black hole. Enable resource collection functionality via the gravitational field surrounding these satellites."

#### **요구사항 분석 (Requirement Analysis)**
*   **클라이언트 (@apps/client):** 
    *   **도감 시스템:** 로컬 데이터(JSON 또는 정적 파일)를 기반으로 수집한 자원 목록을 보여주는 UI 필요. 서버 통신 없이 상태 관리가 이루어져야 함 (LocalStorage 또는 IndexedDB 활용).
    *   **위성 물리 및 로직:** 블랙홀 중심을 기준으로 공전하는 위성 객체 생성. 위성 주변에 '중력 범위(Gravity Zone)' 설정 및 자원 객체와의 충돌/흡수 로직 구현.
*   **서버 (@apps/server):**
    *   자원 수집 시 최종 결과를 동기화하는 API 필요 (단, 도감 확인 자체는 서버 없이 가능해야 함).
    *   위성 및 블랙홀의 초기 설정값(공전 속도, 중력 범위 등)을 전달하는 로직.

---

### 2. 코드 생성을 위한 프롬프트 (Code Generation Prompt)

이 프롬프트를 AI(예: GPT-4, Claude)에게 입력하여 코드를 생성할 수 있습니다.

#### **[Prompt Title: Black Hole Satellite System & Offline Encyclopedia Implementation]**

**Context:**
We are developing a space-themed resource collection game using a monorepo structure (`@apps/client`, `@apps/server`). The goal is to implement an orbiting satellite system that collects resources and an offline-capable encyclopedia.

**Task 1: Resource Encyclopedia (@apps/client)**
1.  **Data Structure:** Define a TypeScript interface for `Resource` (id, name, description, icon, rarity).
2.  **Offline Logic:** Create a store (using Zustand, Redux, or simple Context) that manages "discovered" resources. Use `LocalStorage` to persist data so it works without server requests.
3.  **UI:** 
    *   `EncyclopediaPage`: A grid view of all resources. Locked resources should be grayscale.
    *   `ResourceDetail`: A modal or view showing detailed info of a selected resource.

**Task 2: Satellite Orbit & Gravity Collection (@apps/client)**
1.  **Satellite Physics:** Implement a satellite object that orbits a central "Black Hole" point. Configurable parameters: `orbitRadius`, `rotationSpeed`.
2.  **Gravity Field:** Add a visual and logical "Gravity Zone" around the satellite.
3.  **Collection Logic:** Detect when a resource object enters the satellite's gravity zone. If triggered, animate the resource being pulled towards the satellite and update the resource count.

**Task 3: Backend Synchronization (@apps/server)**
1.  **API:** Create an endpoint `POST /sync/collection` to update the user's permanent collection state when they go back online.
2.  **Schema:** Update the database schema to store which resources a user has discovered.

**Technical Constraints:**
*   **Frontend:** React, TypeScript, Tailwind CSS (for UI), Framer Motion or Three.js (for orbit animation).
*   **Backend:** Node.js, Express/NestJS, PostgreSQL/Prisma.
*   **Architecture:** Decouple the UI from the physics engine to ensure the Encyclopedia remains functional even if the game engine is paused.

**Deliverables:**
1.  TypeScript models and interfaces.
2.  React components for the Encyclopedia.
3.  The math/logic for the satellite orbit and gravity detection.
4.  A sync strategy between local storage and the server.

---

### 3. 상세 구현 플랜 요약 (Implementation Plan)

1.  **Step 1 (Data):** 클라이언트 내부에 `resources.json` 정적 파일을 생성하여 모든 자원 데이터를 정의합니다.
2.  **Step 2 (UI):** `ResourceStore`를 작성하여 사용자가 획득한 아이템 ID 리스트를 `LocalStorage`에 저장하고, 이를 기반으로 도감 UI를 렌더링합니다.
3.  **Step 3 (Physics):** 위성의 공전 로직을 작성합니다. (주로 `Math.cos`, `Math.sin`을 이용한 좌표 계산 또는 물리 엔진 사용)
4.  **Step 4 (Interaction):** 위성과 자원 간의 거리 계산(Distance-based)을 통해 중력 범위 안에 들어왔을 때 자원을 수집하는 이벤트를 발생시킵니다.
5.  **Step 5 (Server):** 수집된 데이터를 주기적으로 서버에 배치 처리(Batch Update)하여 데이터 무결성을 유지합니다.

이 프롬프트를 상황에 맞게 수정하여 사용하시면, 구조화된 코드를 얻으실 수 있습니다. 추가로 특정 기술 스택(예: Three.js 사용 여부 등)을 명시하면 더 정확한 결과가 나옵니다.
        