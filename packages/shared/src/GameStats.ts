import Phaser from 'phaser';
import { SkillData } from './SkillData';
import { INITIAL_STATS } from './Constants';
import { ResourceType, ActiveResearch, SkillCosts } from './Types';

/**
 * 게임의 모든 상태와 스탯을 관리하는 클래스
 */
export class GameStats extends Phaser.Events.EventEmitter {
    // 핵심 스탯
    public force!: number;
    public radius!: number;
    public highDimProb!: number;
    public moveSpeed!: number;
    
    // 자원 및 인벤토리
    public collected!: Record<ResourceType, number>;
    public totalCollected!: Record<ResourceType, number>;
    public totalAll!: number;
    public maxResources!: number;
    public isColorUnlocked!: boolean;
    
    private collectionHistory: { timestamp: number, amount: number }[] = [];
    
    // 로봇팔 및 보조 시스템
    public maxArms!: number;
    public isAutoArmEnabled!: boolean;
    public armSpeedFactor!: number;
    public spawnRateFactor!: number;
    public isNetEnabled!: boolean;
    public netAngle!: number;
    public smallBlackHoleCount: number = 0;
    public smallBlackHoleRadius: number = 150;
    public netDistance: number = 600;
    public specialItemInterval: number = 15000;
    
    // 연구 및 스킬 트리 상태
    public skillLevels!: Record<string, number>;
    public researchReduction!: number; // 기존 researchBonus 명칭 변경 (의미 명확화)
    public maxResearchSlots!: number;
    public activeResearches: ActiveResearch[] = [];
    
    public playtime: number = 0;
    private lastUpdateTime: number = 0;
    private gameStarted: boolean = false;
    public isGameOver: boolean = false;
    public readonly TIME_LIMIT = INITIAL_STATS.TIME_LIMIT; // 5분 (300초)
    public timeSpawnMultiplier: number = 1.0;
    
    public isBoosterCalculating: boolean = false;
    public isBoosterTime: boolean = false;
    public boosterTimeAdded: number = 0;
    private skillTreeData: SkillData[] = [];

    // 이벤트 상수 정의
    public static readonly EVENTS = {
        UPDATE_SCORE: 'updateScore',
        SKILL_UPGRADED: 'skillUpgraded',
        RESEARCH_REDUCED: 'researchTimeReduced',
        GAME_OVER: 'gameOver',
        SPAWN_RATE_CHANGED: 'spawnRateChanged',
        SPECIAL_ITEM_INTERVAL_CHANGED: 'specialItemIntervalChanged',
        CALCULATE_BOOSTER: 'calculateBooster'
    };

    constructor(skillTreeData: SkillData[]) {
        super();
        this.initializeStats(skillTreeData);
    }

    private initializeStats(skillTreeData: SkillData[]) {
        this.skillTreeData = skillTreeData;
        // 초기 스탯 설정 (Constants 참조)
        this.force = INITIAL_STATS.FORCE;
        this.radius = INITIAL_STATS.RADIUS;
        this.highDimProb = INITIAL_STATS.HIGH_DIM_PROB;
        this.moveSpeed = INITIAL_STATS.MOVE_SPEED;
        
        this.collected = { rock: 1000, wood: 1000 };
        this.totalCollected = { rock: 0, wood: 0 };
        this.totalAll = 0;
        this.maxResources = INITIAL_STATS.MAX_RESOURCES;
        this.isColorUnlocked = true; // 시작부터 개방된 상태
        
        this.maxArms = INITIAL_STATS.MAX_ARMS;
        this.isAutoArmEnabled = false;
        this.armSpeedFactor = INITIAL_STATS.ARM_SPEED_FACTOR;
        this.spawnRateFactor = INITIAL_STATS.SPAWN_RATE_FACTOR;
        this.isNetEnabled = false;
        this.netAngle = INITIAL_STATS.NET_ANGLE;
        this.smallBlackHoleCount = 0;
        this.smallBlackHoleRadius = INITIAL_STATS.SMALL_BLACK_HOLE_RADIUS;
        this.netDistance = INITIAL_STATS.NET_DISTANCE;
        this.specialItemInterval = INITIAL_STATS.SPECIAL_ITEM_INTERVAL;

        this.researchReduction = INITIAL_STATS.RESEARCH_BONUS;        this.maxResearchSlots = INITIAL_STATS.MAX_RESEARCH_SLOTS;
        
        this.skillLevels = {};
        this.skillTreeData.forEach(skill => {
            this.skillLevels[skill.id] = 0;
        });
        this.activeResearches = [];
        this.playtime = 0;
        this.gameStarted = false;
        this.isGameOver = false;
        this.collectionHistory = [];
        this.timeSpawnMultiplier = 1.0;
        this.isBoosterCalculating = false;
        this.isBoosterTime = false;
        this.boosterTimeAdded = 0;
    }

    /**
     * 모든 상태 초기화 (다시 시작용)
     */
    reset(skillTreeData: SkillData[]) {
        this.initializeStats(skillTreeData);
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    /**
     * 게임 시작 처리
     */
    startGame() {
        this.gameStarted = true;
        this.isGameOver = false;
        this.lastUpdateTime = Date.now();
    }

    /**
     * 프레임 업데이트: 연구 진행도 처리 (백그라운드 캐치업 포함)
     */
    update(dt: number) {
        if (!this.gameStarted || this.isGameOver || this.isBoosterCalculating) return;

        // 1초(1000ms) 이상의 delta값은 무조건 1초만 누적
        const cappedDt = Math.min(dt, 1000);
        let elapsedSeconds = cappedDt / 1000;
        
        const oldMinutes = Math.floor(this.playtime / 60);
        this.playtime += elapsedSeconds;
        const newMinutes = Math.floor(this.playtime / 60);

        // 1분마다 자원 생성량 20% 증가 (배율 업데이트)
        if (newMinutes > oldMinutes && newMinutes > 0) {
            this.timeSpawnMultiplier = 1 + (newMinutes * 0.2);
            this.emit(GameStats.EVENTS.SPAWN_RATE_CHANGED);
        }

        // 제한시간 체크 (부스터 시간 포함)
        const totalLimit = this.TIME_LIMIT + this.boosterTimeAdded;
        if (this.playtime >= totalLimit) {
            this.playtime = totalLimit;
            if (!this.isBoosterTime && !this.isBoosterCalculating) {
                this.isBoosterCalculating = true;
                this.emit(GameStats.EVENTS.CALCULATE_BOOSTER);
            } else if (this.isBoosterTime) {
                this.isGameOver = true;
                this.emit(GameStats.EVENTS.GAME_OVER);
            }
            this.emit(GameStats.EVENTS.UPDATE_SCORE);
            return;
        }

        if (this.activeResearches.length === 0) return;

        let updated = false;
        
        while (elapsedSeconds > 0 && this.activeResearches.length > 0) {
            // 현재 진행 가능한 연구들 필터링 (선행 조건이 완료된 것만)
            const researchableIndices: number[] = [];
            for (let i = 0; i < this.activeResearches.length; i++) {
                const skill = this.skillTreeData.find(s => s.id === this.activeResearches[i].skillId);
                if (skill && this.isSkillUnlocked(skill, true)) { // true: strict mode (연구 중인 것 제외)
                    researchableIndices.push(i);
                    if (researchableIndices.length >= this.maxResearchSlots) break;
                }
            }

            if (researchableIndices.length === 0) break;

            let minTimeNeeded = Infinity;
            for (const idx of researchableIndices) {
                minTimeNeeded = Math.min(minTimeNeeded, this.activeResearches[idx].remainingTime);
            }
            
            let timeToAdvance = Math.min(elapsedSeconds, minTimeNeeded);
            if (timeToAdvance <= 0) timeToAdvance = 0.001;
            
            for (const idx of researchableIndices) {
                this.activeResearches[idx].remainingTime -= timeToAdvance;
            }
            
            elapsedSeconds -= timeToAdvance;
            updated = true;
            
            let finishedAny = false;
            // 역순으로 순회하여 splice 영향 방지
            for (let i = researchableIndices.length - 1; i >= 0; i--) {
                const idx = researchableIndices[i];
                if (this.activeResearches[idx].remainingTime <= 0) {
                    const skillId = this.activeResearches[idx].skillId;
                    const skill = this.skillTreeData.find(s => s.id === skillId);
                    this.activeResearches.splice(idx, 1);
                    finishedAny = true;
                    if (skill) this.applySkillUpgrade(skill);
                }
            }
            if (!finishedAny && elapsedSeconds <= 0) break;
        }
        
        if (updated) this.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    /**
     * 스킬을 즉시 습득 (초기 보너스 등)
     */
    grantSkill(skill: SkillData) {
        this.applySkillUpgrade(skill);
    }

    /**
     * 부스터 시간 추가 완료 처리
     */
    addBoosterTime(seconds: number) {
        this.boosterTimeAdded = seconds;
        this.isBoosterCalculating = false;
        this.isBoosterTime = true;
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    /**
     * 남은 시간(초) 반환
     */
    getRemainingTime(): number {
        return Math.max(0, (this.TIME_LIMIT + this.boosterTimeAdded) - this.playtime);
    }

    /**
     * 남은 시간을 MM:SS 형식으로 반환
     */
    getFormattedRemainingTime(): string {
        const remaining = this.getRemainingTime();
        const m = Math.floor(remaining / 60);
        const s = Math.floor(remaining % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * 포맷팅된 플레이 시간 반환
     */
    getFormattedPlaytime(): string {
        const h = Math.floor(this.playtime / 3600);
        const m = Math.floor((this.playtime % 3600) / 60);
        const s = Math.floor(this.playtime % 60);
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        
        if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
        return `${m}:${pad(s)}`;
    }

    /**
     * 연구 시간 단축 (로봇팔 수집 보너스 등)
     */
    reduceResearchTime(seconds: number) {
        if (this.activeResearches.length === 0) return;

        const research = this.activeResearches[0];
        research.remainingTime = Math.max(0, research.remainingTime - seconds);
        this.emit(GameStats.EVENTS.RESEARCH_REDUCED, research.skillId);
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    /**
     * 연구 시작 요청
     */
    startResearch(skill: SkillData): boolean {
        const currentLevel = this.skillLevels[skill.id];
        if (currentLevel >= skill.maxLevel) return false;
        if (this.activeResearches.some(r => r.skillId === skill.id)) return false;

        const costs = skill.costs[currentLevel];
        if (!this.canAfford(costs)) return false;

        this.consumeResources(costs);
        this.activeResearches.push({
            skillId: skill.id,
            remainingTime: skill.researchTimes[currentLevel],
            totalTime: skill.researchTimes[currentLevel]
        });
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
        return true;
    }

    /**
     * 스킬 해금 여부 확인 (연구 중인 스킬도 해금 조건 만족으로 간주 가능)
     * @param strict true면 연구가 완료된 스킬만 체크, false면 연구 중인 스킬도 포함
     */
    public isSkillUnlocked(skill: SkillData, strict: boolean = false): boolean {
        if (!skill.prerequisites || skill.prerequisites.length === 0) return true;
        return skill.prerequisites.every(pre => {
            const currentLevel = this.skillLevels[pre.id] || 0;
            if (currentLevel >= pre.level) return true;
            
            if (!strict) {
                // 현재 연구 중인 스킬도 조건 만족으로 간주 (연구 완료 시 레벨업 예정이므로)
                const isResearching = this.activeResearches.some(r => r.skillId === pre.id);
                if (isResearching && currentLevel + 1 >= pre.level) return true;
            }
            
            return false;
        });
    }

    /**
     * 대기 중인 연구 취소 및 자원 환불 (의존성 체크 포함)
     */
    cancelResearch(skill: SkillData): boolean {
        const index = this.activeResearches.findIndex(r => r.skillId === skill.id);
        if (index === -1) return false;

        const currentLevel = this.skillLevels[skill.id];
        const costs = skill.costs[currentLevel];
        
        // 자원 환불
        if (costs.rock) this.collected.rock += costs.rock;
        if (costs.wood) this.collected.wood += costs.wood;

        this.activeResearches.splice(index, 1);

        // 취소된 스킬에 의존하는 후속 연구들도 취소 (재귀 호출)
        for (let i = index; i < this.activeResearches.length; i++) {
            const nextResearch = this.activeResearches[i];
            const nextSkill = this.skillTreeData.find(s => s.id === nextResearch.skillId);
            if (nextSkill && !this.isSkillUnlocked(nextSkill)) {
                this.cancelResearch(nextSkill);
                break; // 재귀 호출이 배열을 수정하므로 루프 중단
            }
        }

        this.emit(GameStats.EVENTS.UPDATE_SCORE);
        return true;
    }
/**
 * 자원 획득 처리 (위치 정보 포함)
 */
addCollected(type: ResourceType, amount: number = 1, x?: number, y?: number) {
    if (amount < 0) return;
    this.collected[type] += amount;
    this.totalCollected[type] += amount;
    this.totalAll += amount;
    this.collectionHistory.push({ timestamp: Date.now(), amount });
    this.emit(GameStats.EVENTS.UPDATE_SCORE);
    this.emit('resourceCollected', type, amount);
    if (x !== undefined && y !== undefined) {
        this.emit('worldResourceCollected', { type, amount, x, y });
    }
}/**
 * 최근 10초간의 자원 획득량 합계 반환
 */
getRecentCollectionAmount(): number {
    const now = Date.now();
    const tenSecondsAgo = now - 10000;
    this.collectionHistory = this.collectionHistory.filter(h => h.timestamp >= tenSecondsAgo);
    return this.collectionHistory.reduce((sum, h) => sum + h.amount, 0);
}

    /**
     * 자원 구매 가능 여부 확인
     */
    canAfford(costs: SkillCosts | undefined): boolean {
        if (!costs) return true;
        if (costs.rock && this.collected.rock < costs.rock) return false;
        if (costs.wood && this.collected.wood < costs.wood) return false;
        return true;
    }

    /**
     * 자원 소모
     */
    private consumeResources(costs: SkillCosts | undefined) {
        if (!costs) return;
        if (costs.rock) this.collected.rock -= costs.rock;
        if (costs.wood) this.collected.wood -= costs.wood;
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    /**
     * 스킬 레벨 업 및 실제 스탯 반영
     */
    private applySkillUpgrade(skill: SkillData) {
        if (this.skillLevels[skill.id] >= skill.maxLevel) return;

        this.skillLevels[skill.id]++;
        
        // 스탯 반영 로직 (분기 처리 최적화)
        const prop = skill.effectProperty;
        const val = skill.effectValue;

        switch (prop) {
            case 'radius': this.radius += val; break;
            case 'force': this.force += val; break;
            case 'highDimProb': this.highDimProb += val; break;
            case 'maxArms': this.maxArms += val; break;
            case 'autoArm': this.isAutoArmEnabled = true; break;
            case 'armSpeed': this.armSpeedFactor += val; break;
            case 'maxResearchSlots': this.maxResearchSlots += val; break;
            case 'spawnRate': this.spawnRateFactor += val; break;
            case 'researchBonus': this.researchReduction += val; break;
            case 'moveSpeed': this.moveSpeed += val; break;
            case 'net': this.isNetEnabled = true; break;
            case 'netAngle': this.netAngle += val; break;
            case 'smallBlackHole': this.smallBlackHoleCount += val; break;
            case 'smallBlackHoleRange': this.smallBlackHoleRadius += val; break;
            case 'netLength': this.netDistance += val; break;
            case 'specialItemBooster': 
                this.specialItemInterval += val * 1000; // val is in seconds (-1), convert to ms (-1000)
                this.emit(GameStats.EVENTS.SPECIAL_ITEM_INTERVAL_CHANGED);
                break;
        }

        this.emit(GameStats.EVENTS.SKILL_UPGRADED, skill.id);
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    } 
}
