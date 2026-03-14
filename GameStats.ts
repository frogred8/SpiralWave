import Phaser from 'phaser';
import { SkillData } from './SkillData';
import { INITIAL_STATS } from './Constants';
import { ResourceType, ActiveResearch, SkillCosts } from './Types';

/**
 * 게임의 모든 상태와 스탯을 관리하는 클래스
 */
export class GameStats extends Phaser.Events.EventEmitter {
    // 핵심 스탯
    public force: number;
    public radius: number;
    public highDimProb: number;
    public moveSpeed: number;
    
    // 자원 및 인벤토리
    public collected: Record<ResourceType, number>;
    public totalCollected: Record<ResourceType, number>;
    public totalAll: number;
    public maxResources: number;
    public isColorUnlocked: boolean;
    
    private collectionHistory: { timestamp: number, amount: number }[] = [];
    
    // 로봇팔 및 보조 시스템
    public maxArms: number;
    public isAutoArmEnabled: boolean;
    public armSpeedFactor: number;
    public spawnRateFactor: number;
    public isNetEnabled: boolean;
    public netAngle: number;
    
    // 연구 및 스킬 트리 상태
    public skillLevels: Record<string, number>;
    public researchReduction: number; // 기존 researchBonus 명칭 변경 (의미 명확화)
    public maxResearchSlots: number;
    public activeResearches: ActiveResearch[] = [];
    
    public playtime: number = 0;
    private lastUpdateTime: number = 0;
    private gameStarted: boolean = false;

    // 이벤트 상수 정의
    public static readonly EVENTS = {
        UPDATE_SCORE: 'updateScore',
        SKILL_UPGRADED: 'skillUpgraded',
        RESEARCH_REDUCED: 'researchTimeReduced'
    };

    constructor(skillTreeData: SkillData[]) {
        super();
        
        // 초기 스탯 설정 (Constants 참조)
        this.force = INITIAL_STATS.FORCE;
        this.radius = INITIAL_STATS.RADIUS;
        this.highDimProb = INITIAL_STATS.HIGH_DIM_PROB;
        this.moveSpeed = INITIAL_STATS.MOVE_SPEED;
        
        this.collected = { rock: 0, wood: 0 };
        this.totalCollected = { rock: 0, wood: 0 };
        this.totalAll = 0;
        this.maxResources = INITIAL_STATS.MAX_RESOURCES;
        this.isColorUnlocked = true; // 시작부터 개방된 상태
        
        this.maxArms = INITIAL_STATS.MAX_ARMS;
        this.isAutoArmEnabled = false;
        this.armSpeedFactor = INITIAL_STATS.ARM_SPEED_FACTOR;
        this.spawnRateFactor = INITIAL_STATS.SPAWN_RATE_FACTOR;
        this.isNetEnabled = false;
        this.netAngle = 45;
        
        this.researchReduction = INITIAL_STATS.RESEARCH_BONUS;
        this.maxResearchSlots = INITIAL_STATS.MAX_RESEARCH_SLOTS;
        
        this.skillLevels = {};
        skillTreeData.forEach(skill => {
            this.skillLevels[skill.id] = 0;
        });
    }

    /**
     * 게임 시작 처리
     */
    startGame() {
        this.gameStarted = true;
        this.lastUpdateTime = Date.now();
    }

    /**
     * 프레임 업데이트: 연구 진행도 처리 (백그라운드 캐치업 포함)
     */
    update(dt: number, skillTreeData: SkillData[]) {
        if (!this.gameStarted) return;

        // 1초(1000ms) 이상의 delta값은 무조건 1초만 누적
        const cappedDt = Math.min(dt, 1000);
        let elapsedSeconds = cappedDt / 1000;
        
        this.playtime += elapsedSeconds;

        if (this.activeResearches.length === 0) return;

        let updated = false;
        
        while (elapsedSeconds > 0 && this.activeResearches.length > 0) {
            let activeCount = Math.min(this.activeResearches.length, this.maxResearchSlots);
            let minTimeNeeded = Infinity;
            
            for (let i = 0; i < activeCount; i++) {
                minTimeNeeded = Math.min(minTimeNeeded, this.activeResearches[i].remainingTime);
            }
            
            let timeToAdvance = Math.min(elapsedSeconds, minTimeNeeded);
            if (timeToAdvance <= 0) timeToAdvance = 0.001;
            
            for (let i = 0; i < activeCount; i++) {
                this.activeResearches[i].remainingTime -= timeToAdvance;
            }
            
            elapsedSeconds -= timeToAdvance;
            updated = true;
            
            let finishedAny = false;
            for (let i = 0; i < activeCount; i++) {
                if (this.activeResearches[i].remainingTime <= 0) {
                    const skillId = this.activeResearches[i].skillId;
                    const skill = skillTreeData.find(s => s.id === skillId);
                    this.activeResearches.splice(i, 1);
                    i--;
                    activeCount--;
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
     * 대기 중인 연구 취소 및 자원 환불
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
        }

        this.emit(GameStats.EVENTS.SKILL_UPGRADED, skill.id);
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    } 
}
