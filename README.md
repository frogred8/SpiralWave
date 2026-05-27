
# Automatic Update - 20260528_0039

## User Feedback
```
피버 모드가 끝나면 블랙홀이 화면 내 남아있는 모든 자원을 획득하게 해줘.
```

## Gemini AI Plan
Implement a logic where the Black Hole automatically collects all remaining resource objects on the screen once Fever Mode expires. 

1. Create a trigger or event listener that detects the end of the Fever Mode state.
2. Upon termination, query all active resource/item entities currently present in the game world.
3. For each identified resource, initiate a collection sequence directed towards the Black Hole entity's coordinates.
4. Ensure the resources are properly processed (added to score/inventory) and despawned once they reach the Black Hole.
        