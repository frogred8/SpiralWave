import Phaser from 'phaser';
import { SKILL_TREE_DATA } from './SkillData';
export class GameStats extends Phaser.Events.EventEmitter {
    force;
    radius;
    collected;
    isColorUnlocked;
    maxResources;
    skillLevels;
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
    addCollected(type, amount = 1) {
        this.collected[type] += amount;
        this.emit('updateScore');
    }
    canAfford(costType, cost) {
        return this.collected[costType] >= cost;
    }
    consumeResources(costType, cost) {
        this.collected[costType] -= cost;
        this.emit('updateScore');
    }
    applySkillUpgrade(skill) {
        if (this.skillLevels[skill.id] < skill.maxLevel) {
            this.skillLevels[skill.id]++;
            // Apply the effect
            if (skill.effectProperty === 'radius') {
                this.radius += skill.effectValue;
            }
            else if (skill.effectProperty === 'force') {
                this.force += skill.effectValue;
            }
            else if (skill.effectProperty === 'maxResources') {
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
