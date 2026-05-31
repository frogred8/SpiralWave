
# Automatic Update - 20260531_1010

## User Feedback
```
더 많은 자원 수집 도구, 더 높은 레벨 가능, 이동속도 같은 의미 없는 스킬 삭제
순위권에 들지 않아도 메인에서 사람들이 남긴 다음 업데이트 제안을 볼 수 있게 해주세요. 어떤 업데이트가 추가 되었는지 날짜별로 볼 수 있는 페이지도요!
다음 업데이트 준비를 위한 리워크
자원을 파괴하는 적 유닛 추가 (로봇팔로 견제 가능)
이동 기능 삭제
돈은 안주고 자동 로봇팔의 어그로를 3번 끌고 사라지는 우주 쓰레기 추가, 블랙홀이나 그물로는 바로 없어짐
전체화면 버튼 추가 (모바일 브라우저 편의성 개선)

특수자원
전체화면 모드 버튼 추가 (모바일 브라우저 사용성 개선)
```

## Gemini AI Plan
Implement the following functional requirements and game logic updates:

- **Resource & Progression System**: 
    - Expand the variety of resource collection tools.
    - Introduce 'Special Resource' types to the collection pool.
    - Increase the maximum player level cap.
    - Remove the player movement mechanic and all associated movement speed skills/upgrades.

- **New Entities & Obstacles**:
    - Implement 'Resource-Destroying Enemies' that target and eliminate resources; ensure they can be countered or blocked by 'Robotic Arms'.
    - Add 'Space Junk' obstacles: 
        - They provide no currency upon interaction.
        - They draw 'Robotic Arm' aggro/targeting 3 times before disappearing.
        - They are instantly removed when interacting with 'Black Holes' or 'Nets'.

- **UI & Accessibility Features**:
    - Add a 'Full-screen' toggle button to the interface, optimized for mobile browser environments.
    - Implement a 'Public Suggestions' section on the main menu that allows all players to view community update proposals regardless of their ranking status.
    - Create an 'Update History' page that lists all implemented changes and patches, organized chronologically by date.
        