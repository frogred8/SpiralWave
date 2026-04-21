
# Update - 20260421_1947

## Raw User Feedback
```
게임이 너무 짧아서 아쉬워요. 30초는 너무 짧은 것 같아요. 1분 정도면 더 재미있게 플레이할 수 있을 것 같아요. 
어떤 목표를 가지고 있는지 시작 화면에 게임에 대한 간단한 팁이 있으면 좋겠어요.
현재 어떤 AI 모델을 쓰는지 게임 플레이 화면 상단에 추가해.
```

## Gemini AI Plan
Act as a senior full-stack developer to update @apps/client and @apps/server based on the following requirements:

1. **Game Duration Adjustment**:
   - Update the game session logic to extend the play time from 30 seconds to 60 seconds.
   - Modify the timer constants in the configuration files and ensure the UI reflects the 1-minute countdown.

2. **Start Screen Enhancement (UX)**:
   - Modify the start screen component in `@apps/client` to include a "Quick Tips" or "Goal" section.
   - Add clear, concise instructions explaining the objective of the game to help new players onboard.

3. **AI Model Information Display**:
   - Update the gameplay UI to include a text element at the top of the screen indicating the AI model currently being used (e.g., "AI Model: [Model Name]").
   - Ensure the model information is correctly fetched from the backend (`@apps/server`) or defined in the client-side environment/context.

**Technical Constraints**:
- Ensure all UI changes are responsive and align with the existing design system.
- Update relevant state management or utility functions to support the duration change.
- Verify that the AI model metadata is correctly passed to the frontend.

---
