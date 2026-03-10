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
    public maxResources: number;
    public isColorUnlocked: boolean;
    
    // 로봇팔 및 보조 시스템
    public maxArms: number;
    public isAutoArmEnabled: boolean;
    public armSpeedFactor: number;
    public spawnRateFactor: number;
    public isNetEnabled: boolean;
    
    // 연구 및 스킬 트리 상태
    public skillLevels: Record<string, number>;
    public researchReduction: number; // 기존 researchBonus 명칭 변경 (의미 명확화)
    public maxResearchSlots: number;
    public activeResearches: ActiveResearch[] = [];
    
    private lastUpdateTime: number = Date.now();

    // 이벤트 상수 정의
    public static readonly EVENTS = {
        UPDATE_SCORE: 'updateScore',
        COLORS_UNLOCKED: 'colorsUnlocked',
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
        
        this.collected = { rock: 0, wood: 0, iron: 0 };
        this.maxResources = INITIAL_STATS.MAX_RESOURCES;
        this.isColorUnlocked = false;
        
        this.maxArms = INITIAL_STATS.MAX_ARMS;
        this.isAutoArmEnabled = false;
        this.armSpeedFactor = INITIAL_STATS.ARM_SPEED_FACTOR;
        this.spawnRateFactor = INITIAL_STATS.SPAWN_RATE_FACTOR;
        this.isNetEnabled = false;
        
        this.researchReduction = INITIAL_STATS.RESEARCH_BONUS;
        this.maxResearchSlots = INITIAL_STATS.MAX_RESEARCH_SLOTS;
        
        this.skillLevels = {};
        skillTreeData.forEach(skill => {
            this.skillLevels[skill.id] = 0;
        });
    }

    /**
     * 프레임 업데이트: 연구 진행도 처리 (백그라운드 캐치업 포함)
     */
    update(dt: number, skillTreeData: SkillData[]) {
        const now = Date.now();
        let elapsedSeconds = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        if (this.activeResearches.length === 0 || elapsedSeconds <= 0) return;

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
        
        // 자원 환불 (최대치 제한)
        if (costs.rock) this.collected.rock = Math.min(this.maxResources, this.collected.rock + costs.rock);
        if (costs.wood) this.collected.wood = Math.min(this.maxResources, this.collected.wood + costs.wood);
        if (costs.iron) this.collected.iron = Math.min(this.maxResources, this.collected.iron + costs.iron);

        this.activeResearches.splice(index, 1);
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
        return true;
    }

    /**
     * 자원 획득 처리
     */
    addCollected(type: ResourceType, amount: number = 1) {
        if (amount < 0) return;
        this.collected[type] = Math.min(this.collected[type] + amount, this.maxResources);
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    }

    /**
     * 자원 구매 가능 여부 확인
     */
    canAfford(costs: SkillCosts): boolean {
        if (costs.rock && this.collected.rock < costs.rock) return false;
        if (costs.wood && this.collected.wood < costs.wood) return false;
        if (costs.iron && this.collected.iron < costs.iron) return false;
        return true;
    }

    /**
     * 자원 소모
     */
    private consumeResources(costs: SkillCosts) {
        if (costs.rock) this.collected.rock -= costs.rock;
        if (costs.wood) this.collected.wood -= costs.wood;
        if (costs.iron) this.collected.iron -= costs.iron;
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
        }

        this.emit(GameStats.EVENTS.SKILL_UPGRADED, skill.id);
        this.emit(GameStats.EVENTS.UPDATE_SCORE);
    } 

    /**
     * 색상 시스템 해금
     */
    unlockColors() {
        if (this.isColorUnlocked) return;
        this.isColorUnlocked = true;
        this.emit(GameStats.EVENTS.COLORS_UNLOCKED);
    }
}
