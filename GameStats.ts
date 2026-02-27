import Phaser from 'phaser';
import { SkillData, SKILL_TREE_DATA } from './SkillData';

export class GameStats extends Phaser.Events.EventEmitter {
    public force: number;
    public radius: number;
    public collected: { rock: number; wood: number; fish: number };
    public isColorUnlocked: boolean;
    public maxResources: number;
    public skillLevels: Record<string, number>;

    constructor() {
        super();
        this.force = 0.5;
        this.radius = 300;
        this.collected = { rock: 0, wood: 0, fish: 0 };
        this.isColorUnlocked = false;
        this.maxResources = 300;
        this.skillLevels = {};

        // Initialize all skill levels to 0
        SKILL_TREE_DATA.forEach(skill => {
            this.skillLevels[skill.id] = 0;
        });
    }

    addCollected(type: 'rock' | 'wood' | 'fish', amount: number = 1) {
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

    canAfford(costType: 'rock' | 'wood' | 'fish', cost: number): boolean {
        return this.collected[costType] >= cost;
    }

    consumeResources(costType: 'rock' | 'wood' | 'fish', cost: number) {
        // Validate input
        if (cost < 0) {
            console.warn('Cannot consume negative resources');
            return;
        }
        if (this.collected[costType] < cost) {
            console.warn('Insufficient resources');
            return;
        }
        this.collected[costType] -= cost;
        this.emit('updateScore');
    }

    applySkillUpgrade(skill: SkillData) {
        // Validate skill exists
        if (!skill || !skill.id) {
            console.error('Invalid skill provided');
            return;
        }
        // Validate effect value is positive
        if (skill.effectValue < 0) {
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
            } else if (skill.effectProperty === 'maxResources') {
                this.maxResources += skill.effectValue;
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