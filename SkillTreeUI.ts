import Phaser from 'phaser';
import { SkillData, SKILL_TREE_DATA } from './SkillData';
import { GameStats } from './GameStats';

export class SkillTreeUI {
    private scene: Phaser.Scene;
    private gameStats: GameStats;
    private skillContainer: Phaser.GameObjects.Container;
    private lineGraphics: Phaser.GameObjects.Graphics;
    private tooltip: Phaser.GameObjects.Container;
    private skillButtons: Record<string, Phaser.GameObjects.Container> = {};

    private readonly startX = 50;
    private readonly startY = 80;
    private readonly spacingX = 140;
    private readonly spacingY = 100;
    private readonly buttonWidth = 100;
    private readonly buttonHeight = 60;
    private readonly buttonBgColor = 0x222222;
    private readonly buttonStrokeColor = 0x555555;
    private readonly buttonHoverStrokeColor = 0x00ffff;
    private readonly buttonDisabledBgColor = 0x111111;
    private readonly buttonDisabledTextColor = '#555555';
    private readonly maxSkillLevel = 20; // Max level for all skills

    constructor(scene: Phaser.Scene, uiContainer: Phaser.GameObjects.Container, gameStats: GameStats) {
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

    private createSkillButtons() {
        SKILL_TREE_DATA.forEach(skill => {
            const x = skill.tree * this.spacingX;
            const y = skill.row * this.spacingY;

            const btn = this.scene.add.container(x, y);
            const bg = this.scene.add.rectangle(0, 0, this.buttonWidth, this.buttonHeight, this.buttonBgColor).setStrokeStyle(3, this.buttonStrokeColor);
            const nameTxt = this.scene.add.text(0, -10, skill.name, { fontSize: '12px', fontStyle: 'bold' }).setOrigin(0.5);
            const lvTxt = this.scene.add.text(0, 15, `Lv. 0/${this.maxSkillLevel}`, { fontSize: '14px', color: '#00ff00' }).setOrigin(0.5);
            
            // Store references for safe access
            (btn as any).skillButtonData = { bg, nameTxt, lvTxt };
            btn.add([bg, nameTxt, lvTxt]);
            btn.setSize(this.buttonWidth, this.buttonHeight).setInteractive({ useHandCursor: true });

            btn.on('pointerdown', () => this.handleSkillUpgrade(skill));
            btn.on('pointerover', (p: any) => {
                const data = (btn as any).skillButtonData;
                if (data) data.bg.setStrokeStyle(3, this.buttonHoverStrokeColor);
                this.tooltip.setVisible(true).setPosition(p.x + 10, p.y + 10);
                const currentLevel = this.gameStats.skillLevels[skill.id];
                const nextLevelEffect = currentLevel < skill.maxLevel ? `\nNext: ${skill.description}` : '\nMax Level';
                (this.tooltip.getAt(1) as Phaser.GameObjects.Text).setText(`${skill.name} (Lv. ${currentLevel}/${skill.maxLevel})${nextLevelEffect}\nCost: ${skill.baseCost} ${skill.costType}`);
            });
            btn.on('pointerout', () => {
                const data = (btn as any).skillButtonData;
                if (data) data.bg.setStrokeStyle(3, this.buttonStrokeColor);
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
                    this.lineGraphics.lineBetween(
                        parentBtn.x + parentBtn.width / 2, parentBtn.y + parentBtn.height / 2,
                        currentBtn.x + currentBtn.width / 2, currentBtn.y + currentBtn.height / 2
                    );
                }
            }
        });
    }

    private setupEventListeners() {
        this.gameStats.on('updateScore', this.refreshSkillTreeUI, this);
        this.gameStats.on('skillUpgraded', this.onSkillUpgraded, this);
    }

    private isSkillUnlocked(skill: SkillData): boolean {
        if (!skill.prereq) return true;
        return this.gameStats.skillLevels[skill.prereq] > 0;
    }

    private handleSkillUpgrade(skill: SkillData) {
        const currentLevel = this.gameStats.skillLevels[skill.id];
        if (currentLevel >= skill.maxLevel || !this.isSkillUnlocked(skill)) {
            this.scene.cameras.main.flash(200, 255, 0, 0, true); // Red flash for failed upgrade
            return;
        }

        if (this.gameStats.canAfford(skill.costType, skill.baseCost)) {
            this.gameStats.consumeResources(skill.costType, skill.baseCost);
            this.gameStats.applySkillUpgrade(skill);
            this.scene.cameras.main.flash(200, 0, 255, 0, true); // Green flash for successful upgrade
        } else {
            this.scene.cameras.main.flash(200, 255, 0, 0, true); // Red flash for insufficient resources
        }
    }

    private refreshSkillTreeUI() {
        SKILL_TREE_DATA.forEach(skill => {
            const btn = this.skillButtons[skill.id];
            const data = (btn as any).skillButtonData;
            if (!data) return; // Safety check
            
            const lv = this.gameStats.skillLevels[skill.id];
            const isUnlocked = this.isSkillUnlocked(skill);
            const canAfford = this.gameStats.canAfford(skill.costType, skill.baseCost);
            const isMaxLevel = lv >= skill.maxLevel;

            data.lvTxt.setText(`Lv. ${lv}/${skill.maxLevel}`);
            
            const { bg, nameTxt, lvTxt } = data;

            if (isMaxLevel) {
                btn.setAlpha(1);
                bg.setFillStyle(0x006600); // Dark green for maxed out
                bg.setStrokeStyle(3, 0x00ff00); // Bright green border
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#ffffff');
                btn.disableInteractive(); // Cannot interact if max level
            } else if (!isUnlocked) {
                btn.setAlpha(0.5);
                bg.setFillStyle(this.buttonDisabledBgColor);
                bg.setStrokeStyle(3, this.buttonStrokeColor);
                nameTxt.setColor('#aaaaaa');
                lvTxt.setColor(this.buttonDisabledTextColor);
                btn.disableInteractive();
            } else if (!canAfford) {
                btn.setAlpha(0.7);
                bg.setFillStyle(this.buttonBgColor);
                bg.setStrokeStyle(3, 0x880000); // Red border for not affordable
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#ff8888');
                btn.setInteractive({ useHandCursor: true }); // Still interactive to show tooltip
            } else {
                btn.setAlpha(1);
                bg.setFillStyle(this.buttonBgColor);
                bg.setStrokeStyle(3, this.buttonStrokeColor);
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#00ff00');
                btn.setInteractive({ useHandCursor: true });
            }
        });
    }

    private onSkillUpgraded(skillId: string) {
        // Optionally add a visual effect to the upgraded skill button
        const btn = this.skillButtons[skillId];
        if (!btn) {
            console.warn(`Skill button not found for skill: ${skillId}`);
            return;
        }
        const data = (btn as any).skillButtonData;
        if (!data || !data.bg) {
            console.warn(`Skill button data not found for skill: ${skillId}`);
            return;
        }
        this.scene.tweens.add({
            targets: data.bg,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 100,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });
    }
}