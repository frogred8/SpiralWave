
# Automatic Update - 20260603_1000

## User Feedback
```
테크트리 세부설명 하나하나 들여다볼 시간이 없어요. 어떤 자원이 얼마나 필요한지 적혀있었으면 좋겠습니다
연구 슬롯을 언제 열 수 있느냐가 클리어 여부 및 성장 가속에 미치는 영향이 너무 큽니다
Explanation about the special items.



무한모드
1분만 플레이하고도 리더보드에 올라가고 싶어요. 5분 플레이어랑 리더보드 나누어져 있었으면 좋겠습니다.
랭킹시스템 도입
랭킹자체는 기록달성할때마다 이름을 새로입력하는방향으로 
이름이 같을경우를위해 헤시값추가
The skill tree has too much randomness.
```

## Gemini AI Plan
Act as a senior game developer. Implement the following features and improvements based on the analyzed user requirements:

1. **Information Transparency Enhancement**
   - Update the Tech Tree UI to explicitly display the types and quantities of resources required for each node without requiring deep navigation.
   - Implement a tooltip or detail panel for "Special Items" that provides clear functional descriptions and stat effects.

2. **Progression & Balance Adjustment**
   - Refactor the research slot unlock mechanics to ensure more predictable growth acceleration; clearly communicate the unlock criteria to the player.
   - Adjust the Skill Tree logic to reduce RNG (randomness) and allow for more strategic, deterministic planning.

3. **New Game Mode: Infinite Mode**
   - Develop a standalone "Infinite Mode" with specialized scoring and scaling difficulty.

4. **Advanced Leaderboard System**
   - Implement a categorized ranking system that separates leaderboards based on session duration (e.g., 1-minute bracket vs. 5-minute bracket).
   - Create a post-game flow that prompts players to enter their name whenever a new record is achieved.
   - Implement a unique identifier logic (e.g., short hash suffix) for player names to distinguish between identical entries in the database.
   - Ensure the ranking logic updates and fetches data based on these specific time-based categories.
        