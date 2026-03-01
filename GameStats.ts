import Phaser from 'phaser';
import { SkillData } from './SkillData';

export class GameStats extends Phaser.Events.EventEmitter {
    public force: number;
    public radius: number;
    public highDimProb: number;
    public collected: { rock: number; wood: number; iron: number };
    public collectedTriangles: { red: number; blue: number; yellow: number };
    public isInitialPhase: boolean;
    public isColorUnlocked: boolean;
    public maxResources: number;
    public maxArms: number;
    public isAutoArmEnabled: boolean;
    public armSpeedFactor: number;
    public skillLevels: Record<string, number>;
    public activeResearch: { skillId: string, remainingTime: number, totalTime: number } | null = null;

    constructor(skillTreeData: SkillData[]) {
        super();
        this.force = 0.5;
        this.radius = 300;
        this.highDimProb = 0.0;
        this.collected = { rock: 0, wood: 0, iron: 0 };
        this.collectedTriangles = { red: 0, blue: 0, yellow: 0 };
        this.isInitialPhase = true;
        this.isColorUnlocked = false;
        this.maxResources = 300;
        this.maxArms = 1;
        this.isAutoArmEnabled = false;
        this.armSpeedFactor = 1.0;
        this.skillLevels = {};

        // Initialize all skill levels to 0
        skillTreeData.forEach(skill => {
            this.skillLevels[skill.id] = 0;
        });
    }

    addTriangle(color: 'red' | 'blue' | 'yellow') {
        this.collectedTriangles[color]++;
        
        // Check if all collected 10
        if (this.isInitialPhase && 
            this.collectedTriangles.red >= 10 && 
            this.collectedTriangles.blue >= 10 && 
            this.collectedTriangles.yellow >= 10) {
            this.isInitialPhase = false;
            this.emit('initialPhaseComplete');
        }
        this.emit('updateScore');
    }

    update(dt: number, skillTreeData: SkillData[]) {
        if (this.activeResearch) {
            this.activeResearch.remainingTime -= dt / 1000;
            if (this.activeResearch.remainingTime <= 0) {
                const skillId = this.activeResearch.skillId;
                const skill = skillTreeData.find(s => s.id === skillId);
                this.activeResearch = null;
                if (skill) {
                    this.applySkillUpgrade(skill);
                }
            }
            this.emit('updateScore'); // To refresh UI including research progress
        }
    }

    startResearch(skill: SkillData) {
        if (this.activeResearch) return false;
        
        const currentLevel = this.skillLevels[skill.id];
        if (currentLevel >= skill.maxLevel) return false;

        const costs = skill.costs[currentLevel];
        if (!this.canAfford(costs)) return false;

        const researchTime = skill.researchTimes[currentLevel];
        
        this.consumeResources(costs);
        this.activeResearch = {
            skillId: skill.id,
            remainingTime: researchTime,
            totalTime: researchTime
        };
        this.emit('updateScore');
        return true;
    }

    addCollected(type: 'rock' | 'wood' | 'iron', amount: number = 1) {
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

    canAfford(costs: { rock?: number, wood?: number, iron?: number }): boolean {
        if (costs.rock && this.collected.rock < costs.rock) return false;
        if (costs.wood && this.collected.wood < costs.wood) return false;
        if (costs.iron && this.collected.iron < costs.iron) return false;
        return true;
    }

    consumeResources(costs: { rock?: number, wood?: number, iron?: number }) {
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
        if (this.skillLevels[skill.id] < skill.maxLevel) {
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
            }
            this.emit('skillUpgraded', skill.id); // Emit a specific event for skill upgrades
            this.emit('updateScore'); // Also update general score display
        }
    } 

    unlockColors() {
        if (!this.isColorUnlocked) {
            this.isColorUnlocked = true;
            this.emit('colorsUnlocked');
        }
    }
}