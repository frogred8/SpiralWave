import Phaser from 'phaser';
import { SkillData } from './SkillData';
import { ResourceType, ActiveResearch, SkillCosts } from './Types';
/**
 * 게임의 모든 상태와 스탯을 관리하는 클래스
 */
export declare class GameStats extends Phaser.Events.EventEmitter {
    force: number;
    radius: number;
    highDimProb: number;
    moveSpeed: number;
    collected: Record<ResourceType, number>;
    totalCollected: Record<ResourceType, number>;
    totalAll: number;
    maxResources: number;
    isColorUnlocked: boolean;
    private collectionHistory;
    maxArms: number;
    isAutoArmEnabled: boolean;
    armSpeedFactor: number;
    spawnRateFactor: number;
    isNetEnabled: boolean;
    netAngle: number;
    smallBlackHoleCount: number;
    smallBlackHoleRadius: number;
    netDistance: number;
    specialItemInterval: number;
    skillLevels: Record<string, number>;
    researchReduction: number;
    maxResearchSlots: number;
    activeResearches: ActiveResearch[];
    playtime: number;
    private lastUpdateTime;
    private gameStarted;
    isGameOver: boolean;
    readonly TIME_LIMIT: number;
    timeSpawnMultiplier: number;
    isBoosterCalculating: boolean;
    isBoosterTime: boolean;
    boosterTimeAdded: number;
    private skillTreeData;
    static readonly EVENTS: {
        UPDATE_SCORE: string;
        SKILL_UPGRADED: string;
        RESEARCH_REDUCED: string;
        GAME_OVER: string;
        SPAWN_RATE_CHANGED: string;
        SPECIAL_ITEM_INTERVAL_CHANGED: string;
        CALCULATE_BOOSTER: string;
    };
    constructor(skillTreeData: SkillData[]);
    private initializeStats;
    /**
     * 모든 상태 초기화 (다시 시작용)
     */
    reset(skillTreeData: SkillData[]): void;
    /**
     * 게임 시작 처리
     */
    startGame(): void;
    /**
     * 프레임 업데이트: 연구 진행도 처리 (백그라운드 캐치업 포함)
     */
    update(dt: number): void;
    /**
     * 스킬을 즉시 습득 (초기 보너스 등)
     */
    grantSkill(skill: SkillData): void;
    /**
     * 부스터 시간 추가 완료 처리
     */
    addBoosterTime(seconds: number): void;
    /**
     * 남은 시간(초) 반환
     */
    getRemainingTime(): number;
    /**
     * 남은 시간을 MM:SS 형식으로 반환
     */
    getFormattedRemainingTime(): string;
    /**
     * 포맷팅된 플레이 시간 반환
     */
    getFormattedPlaytime(): string;
    /**
     * 연구 시간 단축 (로봇팔 수집 보너스 등)
     */
    reduceResearchTime(seconds: number): void;
    /**
     * 연구 시작 요청
     */
    startResearch(skill: SkillData): boolean;
    /**
     * 스킬 해금 여부 확인 (연구 중인 스킬도 해금 조건 만족으로 간주)
     */
    isSkillUnlocked(skill: SkillData): boolean;
    /**
     * 대기 중인 연구 취소 및 자원 환불 (의존성 체크 포함)
     */
    cancelResearch(skill: SkillData): boolean;
    /**
     * 자원 획득 처리 (위치 정보 포함)
     */
    addCollected(type: ResourceType, amount?: number, x?: number, y?: number): void; /**
     * 최근 10초간의 자원 획득량 합계 반환
     */
    getRecentCollectionAmount(): number;
    /**
     * 자원 구매 가능 여부 확인
     */
    canAfford(costs: SkillCosts | undefined): boolean;
    /**
     * 자원 소모
     */
    private consumeResources;
    /**
     * 스킬 레벨 업 및 실제 스탯 반영
     */
    private applySkillUpgrade;
}
