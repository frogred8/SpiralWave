
# Automatic Update - 20260604_1000

## User Feedback
```
무제한모드 어떻게 함?
```

## Gemini AI Plan
Implement an 'Endless Mode' feature for the game to allow gameplay without time constraints. The plan includes:

1. **State Management Update**: Add a new game mode state (e.g., `isEndlessMode`) to the global state controller.
2. **Game Logic Modification**:
    - Update the timer logic to stop counting down or switch to a count-up timer when `isEndlessMode` is active.
    - Disable the time-based 'Game Over' condition.
    - Ensure the game loop continues until manual exit or other non-time-based fail conditions are met.
3. **UI Integration**:
    - Add a toggle or button in the Main Menu or Level Selection screen to enable 'Endless Mode'.
    - Update the in-game HUD to display "Endless" or a stopwatch instead of a countdown timer.
4. **Scoring System Adjustments**: 
    - Implement a separate high-score tracking system specifically for Endless Mode to maintain balance with the standard mode.
        