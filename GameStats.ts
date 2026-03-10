import Phaser from 'phaser';
import { SkillData } from './SkillData';
import { INITIAL_STATS } from './Constants';
import { ResourceType, ActiveResearch, SkillCosts } from './Types';

export class GameStats extends Phaser.Events.EventEmitter {
    public force: number;
    public radius: number;
    public highDimProb: number;
    public collected: Record<ResourceType, number>;
    public isInitialPhase: boolean;
    public isColorUnlocked: boolean;
    public maxResources: number;
    public maxArms: number;
    public isAutoArmEnabled: boolean;
    public armSpeedFactor: number;
    public spawnRateFactor: number;
    public researchBonus: number;
    public moveSpeed: number;
    public isNetEnabled: boolean;
    public skillLevels: Record<string, number>;
    public maxResearchSlots: number;
    public activeResearches: ActiveResearch[] = [];
    private lastUpdateTime: number = Date.now();

    constructor(skillTreeData: SkillData[]) {
        super();
        this.force = INITIAL_STATS.FORCE;
        this.radius = INITIAL_STATS.RADIUS;
        this.highDimProb = INITIAL_STATS.HIGH_DIM_PROB;
        this.collected = { rock: 0, wood: 0, iron: 0 };
        this.isInitialPhase = false;
        this.isColorUnlocked = false;
        this.maxResources = INITIAL_STATS.MAX_RESOURCES;
        this.maxArms = INITIAL_STATS.MAX_ARMS;
        this.isAutoArmEnabled = false;
        this.armSpeedFactor = INITIAL_STATS.ARM_SPEED_FACTOR;
        this.spawnRateFactor = INITIAL_STATS.SPAWN_RATE_FACTOR;
        this.researchBonus = INITIAL_STATS.RESEARCH_BONUS;
        this.moveSpeed = INITIAL_STATS.MOVE_SPEED;
        this.isNetEnabled = false;
        this.skillLevels = {};
        this.maxResearchSlots = INITIAL_STATS.MAX_RESEARCH_SLOTS;

        // Initialize all skill levels to 0
        skillTreeData.forEach(skill => {
            this.skillLevels[skill.id] = 0;
        });
    }

    update(dt: number, skillTreeData: SkillData[]) {
        const now = Date.now();
        // Use true elapsed time since last update to handle background tab throttling/pausing
        let elapsedSeconds = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        if (this.activeResearches.length === 0 || elapsedSeconds <= 0) return;

        let updated = false;
        
        // Catch-up logic: Advance time in chunks until all elapsedSeconds are consumed
        // or no more researches are active.
        while (elapsedSeconds > 0 && this.activeResearches.length > 0) {
            let activeCount = Math.min(this.activeResearches.length, this.maxResearchSlots);
            let minTimeNeeded = Infinity;
            
            // Find the soonest research to finish among active slots
            for (let i = 0; i < activeCount; i++) {
                minTimeNeeded = Math.min(minTimeNeeded, this.activeResearches[i].remainingTime);
            }
            
            // Advance by the smaller of elapsedSeconds or minTimeNeeded
            let timeToAdvance = Math.min(elapsedSeconds, minTimeNeeded);
            if (timeToAdvance <= 0) {
                // This could happen if remainingTime is already 0
                timeToAdvance = 0.001; // Tiny step to avoid infinite loop
            }
            
            for (let i = 0; i < activeCount; i++) {
                this.activeResearches[i].remainingTime -= timeToAdvance;
            }
            
            elapsedSeconds -= timeToAdvance;
            updated = true;
            
            // Check for finished researches
            let finishedAny = false;
            for (let i = 0; i < activeCount; i++) {
                if (this.activeResearches[i].remainingTime <= 0) {
                    const skillId = this.activeResearches[i].skillId;
                    const skill = skillTreeData.find(s => s.id === skillId);
                    this.activeResearches.splice(i, 1);
                    i--;
                    activeCount--;
                    finishedAny = true;
                    if (skill) {
                        this.applySkillUpgrade(skill);
                    }
                }
            }
            
            // If we didn't finish any, and we still have elapsedSeconds, it means 
            // we've advanced exactly by elapsedSeconds and no research reached 0 yet.
            if (!finishedAny && elapsedSeconds <= 0) break;
        }
        
        if (updated) {
            this.emit('updateScore');
        }
    }

    reduceResearchTime(seconds: number) {
        if (this.activeResearches.length === 0) return;

        // Reduce time for the first active research
        const research = this.activeResearches[0];
        research.remainingTime = Math.max(0, research.remainingTime - seconds);
        this.emit('researchTimeReduced', research.skillId);
        this.emit('updateScore');
    }

    startResearch(skill: SkillData) {
        // Can only queue if total researches < max slots * some multiplier or just some limit?
        // Let's say we can queue as many as we want, but only maxResearchSlots progress.
        // Wait, the prompt says "skill queue count increases".
        // Let's allow unlimited queueing but only maxResearchSlots progress.
        // Actually, some games limit the queue size too.
        // Let's just limit the active ones for now, OR allow queueing.
        // "스킬 연구를 여러개 할 수 있게 큐 시스템을 만들어"
        // I'll allow queueing up to, say, 10 items? Or unlimited.
        // But the check should be about resources.
        
        const currentLevel = this.skillLevels[skill.id];
        if (currentLevel >= skill.maxLevel) return false;

        // Check if this skill is already in the queue (anywhere)
        if (this.activeResearches.some(r => r.skillId === skill.id)) return false;

        const costs = skill.costs[currentLevel];
        if (!this.canAfford(costs)) return false;

        const researchTime = skill.researchTimes[currentLevel];
        
        this.consumeResources(costs);
        this.activeResearches.push({
            skillId: skill.id,
            remainingTime: researchTime,
            totalTime: researchTime
        });
        this.emit('updateScore');
        return true;
    }

    cancelResearch(skill: SkillData) {
        const index = this.activeResearches.findIndex(r => r.skillId === skill.id);
        if (index === -1) return false;

        // Refund costs
        const currentLevel = this.skillLevels[skill.id];
        const costs = skill.costs[currentLevel];
        
        if (costs.rock) this.collected.rock = Math.min(this.maxResources, this.collected.rock + costs.rock);
        if (costs.wood) this.collected.wood = Math.min(this.maxResources, this.collected.wood + costs.wood);
        if (costs.iron) this.collected.iron = Math.min(this.maxResources, this.collected.iron + costs.iron);

        this.activeResearches.splice(index, 1);
        this.emit('updateScore');
        return true;
    }

    addCollected(type: ResourceType, amount: number = 1) {
        // Validate input
        if (amount < 0) {
            console.warn('Cannot add negative resources');
            return;
        }
        // Cap at maxResources
        const newTotal = this.collected[type] + amount;
        this.collected[type] = Math.min(newTotal, this.maxResources);
        this.emit('updateScore');
    }

    canAfford(costs: SkillCosts): boolean {
        if (costs.rock && this.collected.rock < costs.rock) return false;
        if (costs.wood && this.collected.wood < costs.wood) return false;
        if (costs.iron && this.collected.iron < costs.iron) return false;
        return true;
    }

    consumeResources(costs: SkillCosts) {
        if (!this.canAfford(costs)) {
            console.warn('Insufficient resources');
            return;
        }
        if (costs.rock) this.collected.rock -= costs.rock;
        if (costs.wood) this.collected.wood -= costs.wood;
        if (costs.iron) this.collected.iron -= costs.iron;
        this.emit('updateScore');
    }

    applySkillUpgrade(skill: SkillData) {
        // Validate skill exists
        if (!skill || !skill.id) {
            console.error('Invalid skill provided');
            return;
        }
        // Validate effect value is positive
        if (skill.effectValue < 0 && (skill.effectProperty !== 'autoArm' && skill.effectProperty !== 'armSpeed')) {
            console.warn('Skill effect value must be non-negative');
            return;
        }
        if (this.skillLevels[skill.id] >= skill.maxLevel) return;

        this.skillLevels[skill.id]++;
        
        // Apply the effect
        if (skill.effectProperty === 'radius') {
            this.radius += skill.effectValue;
        } else if (skill.effectProperty === 'force') {
            this.force += skill.effectValue;
        } else if (skill.effectProperty === 'highDimProb') {
            this.highDimProb += skill.effectValue;
        } else if (skill.effectProperty === 'maxArms') {
            this.maxArms += skill.effectValue;
        } else if (skill.effectProperty === 'autoArm') {
            this.isAutoArmEnabled = true;
        } else if (skill.effectProperty === 'armSpeed') {
            this.armSpeedFactor += skill.effectValue;
        } else if (skill.effectProperty === 'maxResearchSlots') {
            this.maxResearchSlots += skill.effectValue;
        } else if (skill.effectProperty === 'spawnRate') {
            this.spawnRateFactor += skill.effectValue;
        } else if (skill.effectProperty === 'researchBonus') {
            this.researchBonus += skill.effectValue;
        } else if (skill.effectProperty === 'moveSpeed') {
            this.moveSpeed += skill.effectValue;
        } else if (skill.effectProperty === 'net') {
            this.isNetEnabled = true;
        }
        this.emit('skillUpgraded', skill.id); // Emit a specific event for skill upgrades
        this.emit('updateScore'); // Also update general score display
    } 

    unlockColors() {
        if (this.isColorUnlocked) return;
        this.isColorUnlocked = true;
        this.emit('colorsUnlocked');
    }
}