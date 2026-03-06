import Phaser from 'phaser';
export class GameStats extends Phaser.Events.EventEmitter {
    force;
    radius;
    highDimProb;
    collected;
    collectedTriangles;
    isInitialPhase;
    isColorUnlocked;
    maxResources;
    maxArms;
    isAutoArmEnabled;
    armSpeedFactor;
    skillLevels;
    maxResearchSlots;
    activeResearches = [];
    constructor(skillTreeData) {
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
        this.maxResearchSlots = 1;
        // Initialize all skill levels to 0
        skillTreeData.forEach(skill => {
            this.skillLevels[skill.id] = 0;
        });
    }
    addTriangle(color) {
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
    update(dt, skillTreeData) {
        if (this.activeResearches.length > 0) {
            let updated = false;
            // Process all active researches up to maxResearchSlots
            for (let i = 0; i < this.activeResearches.length; i++) {
                if (i < this.maxResearchSlots) {
                    this.activeResearches[i].remainingTime -= dt / 1000;
                    updated = true;
                    if (this.activeResearches[i].remainingTime <= 0) {
                        const skillId = this.activeResearches[i].skillId;
                        const skill = skillTreeData.find(s => s.id === skillId);
                        this.activeResearches.splice(i, 1);
                        i--; // Adjust index after splice
                        if (skill) {
                            this.applySkillUpgrade(skill);
                        }
                    }
                }
            }
            if (updated) {
                this.emit('updateScore'); // To refresh UI including research progress
            }
        }
    }
    reduceResearchTime(seconds) {
        if (this.activeResearches.length > 0) {
            // Reduce time for the first active research
            const research = this.activeResearches[0];
            research.remainingTime = Math.max(0, research.remainingTime - seconds);
            this.emit('researchTimeReduced', research.skillId);
            this.emit('updateScore');
        }
    }
    startResearch(skill) {
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
        if (currentLevel >= skill.maxLevel)
            return false;
        // Check if this skill is already in the queue (anywhere)
        if (this.activeResearches.some(r => r.skillId === skill.id))
            return false;
        const costs = skill.costs[currentLevel];
        if (!this.canAfford(costs))
            return false;
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
    addCollected(type, amount = 1) {
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
    canAfford(costs) {
        if (costs.rock && this.collected.rock < costs.rock)
            return false;
        if (costs.wood && this.collected.wood < costs.wood)
            return false;
        if (costs.iron && this.collected.iron < costs.iron)
            return false;
        return true;
    }
    consumeResources(costs) {
        if (!this.canAfford(costs)) {
            console.warn('Insufficient resources');
            return;
        }
        if (costs.rock)
            this.collected.rock -= costs.rock;
        if (costs.wood)
            this.collected.wood -= costs.wood;
        if (costs.iron)
            this.collected.iron -= costs.iron;
        this.emit('updateScore');
    }
    applySkillUpgrade(skill) {
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
            }
            else if (skill.effectProperty === 'force') {
                this.force += skill.effectValue;
            }
            else if (skill.effectProperty === 'highDimProb') {
                this.highDimProb += skill.effectValue;
            }
            else if (skill.effectProperty === 'maxArms') {
                this.maxArms += skill.effectValue;
            }
            else if (skill.effectProperty === 'autoArm') {
                this.isAutoArmEnabled = true;
            }
            else if (skill.effectProperty === 'armSpeed') {
                this.armSpeedFactor += skill.effectValue;
            }
            else if (skill.effectProperty === 'maxResearchSlots') {
                this.maxResearchSlots += skill.effectValue;
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
