
# Automatic Update - 20260328_1321

## Raw User Feedback
```

        수집한 자원의 도감 및 상세 정보 확인 기능 (서버 요청 없이도 가능)
        블랙홀 주변을 도는 위성 추가. 위성 주변부의 중력으로 자원 수집 가능 
    
```

## Gemini AI Plan
**Code Generation Prompt: Space Resource Collection and Orbital System**

**1. Requirements Translation & Analysis**
- **Resource Encyclopedia:** Implementation of a client-side system to view detailed information and a list of collected resources. Data must be accessible without server-side fetching for every view action.
- **Orbital Satellites:** Addition of satellite entities that revolve around a central Black Hole coordinate.
- **Gravity-based Collection:** A proximity-based mechanic where satellites "attract" or collect resources within a specific gravitational radius.

**2. Technical Specifications**
- **Client-Side State (@apps/client):**
    - Define a `ResourceMetadata` registry (static constant) containing descriptions, names, and icons.
    - Implement a `useCollectionStore` (Zustand/Redux) to manage the IDs of resources currently owned/discovered by the player.
    - Create `EncyclopediaList` and `ResourceDetail` components utilizing the local store and registry.
- **Physics & Mechanics (@apps/client):**
    - **Orbit Logic:** Calculate satellite positions using `x = cx + r * cos(θ)` and `y = cy + r * sin(θ)` where `(cx, cy)` is the Black Hole center.
    - **Gravity Detection:** Implement a proximity check in the animation loop. If `distance(satellite, resource) < gravityRadius`, move the resource toward the satellite and trigger the `collectResource` action.
- **Server Sync (@apps/server):**
    - Provide an endpoint to save/load the user's collection state, ensuring the initial load populates the client-side store.

**3. Implementation Plan**
- **Phase 1: Data Architecture**
    - Define TypeScript interfaces for `Resource`, `Satellite`, and `OrbitState`.
    - Create the static resource information library.
- **Phase 2: UI Development**
    - Build the Encyclopedia UI that filters the static library based on the user's collected IDs.
    - Ensure zero-latency navigation between resource details.
- **Phase 3: Orbital Simulation**
    - Implement a `useOrbit` hook or a dedicated system to handle the frame-by-frame update of satellite positions around the Black Hole.
- **Phase 4: Collection Logic**
    - Develop the "Gravity Well" logic to detect nearby resources and handle the transition from "Floating" to "Collected" status.
    - Update the collection state upon successful gravity-based gathering.

**Instruction:** Generate the TypeScript code for the `ResourceRegistry`, the `OrbitSystem` physics logic, and the `Encyclopedia` UI components according to this plan.
        