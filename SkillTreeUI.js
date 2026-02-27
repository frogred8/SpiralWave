import { SKILL_TREE_DATA } from './SkillData';
export class SkillTreeUI {
    scene;
    gameStats;
    skillContainer;
    lineGraphics;
    tooltip;
    skillButtons = {};
    startX = 50;
    startY = 80;
    spacingX = 140;
    spacingY = 100;
    buttonWidth = 100;
    buttonHeight = 60;
    buttonBgColor = 0x222222;
    buttonStrokeColor = 0x555555;
    buttonHoverStrokeColor = 0x00ffff;
    buttonDisabledBgColor = 0x111111;
    buttonDisabledTextColor = '#555555';
    maxSkillLevel = 20; // Max level for all skills
    constructor(scene, uiContainer, gameStats) {
        this.scene = scene;
        this.gameStats = gameStats;
        this.skillContainer = this.scene.add.container(this.startX, this.startY);
        this.lineGraphics = this.scene.add.graphics();
        this.skillContainer.add(this.lineGraphics);
        this.tooltip = this.scene.add.container(0, 0).setVisible(false).setDepth(100);
        const tipBg = this.scene.add.rectangle(0, 0, 200, 80, 0x111111, 0.9).setStrokeStyle(2, 0x444444).setOrigin(0);
        const tipText = this.scene.add.text(10, 10, '', { fontSize: '14px', color: '#ffffff', wordWrap: { width: 180 } });
        this.tooltip.add([tipBg, tipText]);
        uiContainer.add([this.skillContainer, this.tooltip]);
        this.createSkillButtons();
        this.setupEventListeners();
        this.refreshSkillTreeUI(); // Initial refresh
    }
    createSkillButtons() {
        SKILL_TREE_DATA.forEach(skill => {
            const x = skill.tree * this.spacingX;
            const y = skill.row * this.spacingY;
            const btn = this.scene.add.container(x, y);
            const bg = this.scene.add.rectangle(0, 0, this.buttonWidth, this.buttonHeight, this.buttonBgColor).setStrokeStyle(3, this.buttonStrokeColor);
            const nameTxt = this.scene.add.text(0, -10, skill.name, { fontSize: '12px', fontStyle: 'bold' }).setOrigin(0.5);
            const lvTxt = this.scene.add.text(0, 15, `Lv. 0/${this.maxSkillLevel}`, { fontSize: '14px', color: '#00ff00' }).setOrigin(0.5);
            btn.add([bg, nameTxt, lvTxt]);
            btn.setSize(this.buttonWidth, this.buttonHeight).setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => this.handleSkillUpgrade(skill));
            btn.on('pointerover', (p) => {
                bg.setStrokeStyle(3, this.buttonHoverStrokeColor);
                this.tooltip.setVisible(true).setPosition(p.x + 10, p.y + 10);
                const currentLevel = this.gameStats.skillLevels[skill.id];
                const nextLevelEffect = currentLevel < skill.maxLevel ? `\nNext: ${skill.description}` : '\nMax Level';
                this.tooltip.getAt(1).setText(`${skill.name} (Lv. ${currentLevel}/${skill.maxLevel})${nextLevelEffect}\nCost: ${skill.baseCost} ${skill.costType}`);
            });
            btn.on('pointerout', () => {
                bg.setStrokeStyle(3, this.buttonStrokeColor);
                this.tooltip.setVisible(false);
            });
            this.skillButtons[skill.id] = btn;
            this.skillContainer.add(btn);
            // Draw lines between skills
            if (skill.prereq) {
                const parent = SKILL_TREE_DATA.find(s => s.id === skill.prereq);
                if (parent) {
                    this.lineGraphics.lineStyle(2, 0x333333);
                    // Adjust line start/end points to connect to the center of buttons
                    const parentBtn = this.skillButtons[parent.id];
                    const currentBtn = this.skillButtons[skill.id];
                    this.lineGraphics.lineBetween(parentBtn.x + parentBtn.width / 2, parentBtn.y + parentBtn.height / 2, currentBtn.x + currentBtn.width / 2, currentBtn.y + currentBtn.height / 2);
                }
            }
        });
    }
    setupEventListeners() {
        this.gameStats.on('updateScore', this.refreshSkillTreeUI, this);
        this.gameStats.on('skillUpgraded', this.onSkillUpgraded, this);
    }
    isSkillUnlocked(skill) {
        if (!skill.prereq)
            return true;
        return this.gameStats.skillLevels[skill.prereq] > 0;
    }
    handleSkillUpgrade(skill) {
        const currentLevel = this.gameStats.skillLevels[skill.id];
        if (currentLevel >= skill.maxLevel || !this.isSkillUnlocked(skill)) {
            this.scene.cameras.main.flash(200, 255, 0, 0, true); // Red flash for failed upgrade
            return;
        }
        if (this.gameStats.canAfford(skill.costType, skill.baseCost)) {
            this.gameStats.consumeResources(skill.costType, skill.baseCost);
            this.gameStats.applySkillUpgrade(skill);
            this.scene.cameras.main.flash(200, 0, 255, 0, true); // Green flash for successful upgrade
        }
        else {
            this.scene.cameras.main.flash(200, 255, 0, 0, true); // Red flash for insufficient resources
        }
    }
    refreshSkillTreeUI() {
        SKILL_TREE_DATA.forEach(skill => {
            const btn = this.skillButtons[skill.id];
            const lv = this.gameStats.skillLevels[skill.id];
            const isUnlocked = this.isSkillUnlocked(skill);
            const canAfford = this.gameStats.canAfford(skill.costType, skill.baseCost);
            const isMaxLevel = lv >= skill.maxLevel;
            btn.list[2].setText(`Lv. ${lv}/${skill.maxLevel}`);
            const bg = btn.list[0];
            const nameTxt = btn.list[1];
            const lvTxt = btn.list[2];
            if (isMaxLevel) {
                btn.setAlpha(1);
                bg.setFillStyle(0x006600); // Dark green for maxed out
                bg.setStrokeStyle(3, 0x00ff00); // Bright green border
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#ffffff');
                btn.disableInteractive(); // Cannot interact if max level
            }
            else if (!isUnlocked) {
                btn.setAlpha(0.5);
                bg.setFillStyle(this.buttonDisabledBgColor);
                bg.setStrokeStyle(3, this.buttonStrokeColor);
                nameTxt.setColor('#aaaaaa');
                lvTxt.setColor(this.buttonDisabledTextColor);
                btn.disableInteractive();
            }
            else if (!canAfford) {
                btn.setAlpha(0.7);
                bg.setFillStyle(this.buttonBgColor);
                bg.setStrokeStyle(3, 0x880000); // Red border for not affordable
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#ff8888');
                btn.setInteractive({ useHandCursor: true }); // Still interactive to show tooltip
            }
            else {
                btn.setAlpha(1);
                bg.setFillStyle(this.buttonBgColor);
                bg.setStrokeStyle(3, this.buttonStrokeColor);
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#00ff00');
                btn.setInteractive({ useHandCursor: true });
            }
        });
    }
    onSkillUpgraded(skillId) {
        // Optionally add a visual effect to the upgraded skill button
        const btn = this.skillButtons[skillId];
        if (btn) {
            const bg = btn.list[0];
            this.scene.tweens.add({
                targets: bg,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeInOut'
            });
        }
    }
}
