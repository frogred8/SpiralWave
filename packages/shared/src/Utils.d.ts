/**
 * 게임 전반에서 사용되는 유틸리티 함수들
 */
export declare const Utils: {
    /**
     * 스킬 트리 데이터를 랜덤하게 배치하고 의존성을 설정합니다.
     */
    generateRandomSkillTree(skillData: any[]): any[];
    /**
     * 두 지점 사이의 거리를 계산합니다.
     */
    getDistance(x1: number, y1: number, x2: number, y2: number): number;
    /**
     * 두 지점 사이의 각도를 라디안으로 계산합니다.
     */
    getAngle(x1: number, y1: number, x2: number, y2: number): number;
    /**
     * 화면 가장자리(Top, Right, Bottom, Left) 중 한 곳의 무작위 좌표를 반환합니다.
     */
    getRandomEdgePosition(width: number, height: number): {
        x: number;
        y: number;
    };
    /**
     * 스탯 속성에 따른 포맷팅된 문자열을 반환합니다.
     */
    formatStatValue(property: string, value: number, level: number): string;
    /**
     * 스탯 속성에 따른 보너스 수치를 포맷팅하여 반환합니다.
     */
    formatBonusValue(property: string, bonus: number, level: number): string;
};
