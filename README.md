
# Automatic Update - 20260421_2113

## Raw User Feedback
```

게임이 너무 짧아서 아쉬워요. 30초는 너무 짧은 것 같아요. 1분 정도면 더 재미있게 플레이할 수 있을 것 같아요. 
어떤 목표를 가지고 있는지 시작 화면에 게임에 대한 간단한 팁이 있으면 좋겠어요.
현재 어떤 AI 모델을 쓰는지 게임 플레이 화면 상단에 추가해.
    
```

## Gemini AI Plan
@apps/client @apps/server

1. Update the game duration configuration in the client-side logic to increase the play time from 30 seconds to 60 seconds. Ensure the timer initialization and UI display reflect this change.
2. Modify the game's start/landing screen component to include a "How to Play" or "Game Tips" section that clearly outlines the game's objectives and basic mechanics to guide new users.
3. Synchronize any server-side validation or session management logic that depends on the game duration to match the updated 60-second limit.
        