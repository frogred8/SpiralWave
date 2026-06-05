
# Automatic Update - 20260605_1000

## User Feedback
```
버전이 왜 있는지 모르겠어요. 버전 하나에 계속 업데이트가 쌓이는게 보람이 있지 않을까요! 이동속도 의미 없는 업그레이드 여전히 존재하고, 로봇팔 잡은 위치에 작은 블랙홀 생성하는 업그레이드 좋았는데 다른 버전에만 추가 되고 안정화 버전엔 없네요


플레이 방법에 대한 매뉴얼 혹은 튜토리얼이 있으면 좋겠어 (조작법, 목표 등)

HAHA
J
먼가?어렵네요...튜토리얼 필요
```

## Gemini AI Plan
Develop a feature update for the game based on the following technical requirements:

1. **Tutorial and Manual System**:
    - Implement a `TutorialManager` to guide new players through basic controls and game objectives.
    - Create a Manual UI overlay that displays a summary of control mappings and the primary win/loss conditions.

2. **Robotic Arm Upgrade Logic (Black Hole Effect)**:
    - Port the 'Black Hole' mechanic to the stable build. When the robotic arm performs a 'grab' action, instantiate a `BlackHoleEffect` entity at the specific interaction coordinates.
    - Define the `BlackHoleEffect` properties: a localized pull force (vector math toward center) and a specific duration before despawning.

3. **Movement Speed Upgrade Rebalancing**:
    - Review the `UpgradeManager` logic for movement speed. Increase the scaling coefficient or add a secondary utility (e.g., reduced dash cooldown or increased agility) to ensure the upgrade provides a perceptible gameplay advantage.

4. **Unified Progression Structure**:
    - Refactor the versioning/session logic to ensure all gameplay updates and player progression are consolidated into a single continuous update path, rather than maintaining isolated feature branches.
        