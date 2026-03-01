import Phaser from 'phaser';
import { SkillData } from './SkillData';
import { GameStats } from './GameStats';

export class SkillTreeUI {
    private scene: Phaser.Scene;
    private gameStats: GameStats;
    private skillContainer: Phaser.GameObjects.Container;
    private lineGraphics: Phaser.GameObjects.Graphics;
    private tooltip: Phaser.GameObjects.Container;
    private tipBg!: Phaser.GameObjects.Rectangle;
    private tipText!: Phaser.GameObjects.Text;
    private costLines: Phaser.GameObjects.Text[] = [];
    private skillButtons: Record<string, Phaser.GameObjects.Container> = {};
    private skillTreeData: SkillData[];

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

    constructor(scene: Phaser.Scene, uiContainer: Phaser.GameObjects.Container, gameStats: GameStats, skillTreeData: SkillData[]) {
        this.scene = scene;
        this.gameStats = gameStats;
        this.skillTreeData = skillTreeData;

        this.skillContainer = this.scene.add.container(this.startX, this.startY);
        this.lineGraphics = this.scene.add.graphics();
        this.skillContainer.add(this.lineGraphics);

        // 툴팁 구성 요소 초기화
        this.tooltip = this.scene.add.container(0, 0).setVisible(false).setDepth(100);
        this.tipBg = this.scene.add.rectangle(0, 0, 200, 100, 0x111111, 0.9).setStrokeStyle(2, 0x444444).setOrigin(0);
        this.tipText = this.scene.add.text(10, 10, '', { fontSize: '14px', color: '#ffffff', wordWrap: { width: 180 } });
        this.tooltip.add([this.tipBg, this.tipText]);

        // 자원별 비용 표시를 위한 텍스트 객체들 (최대 5종류)
        for (let i = 0; i < 5; i++) {
            const line = this.scene.add.text(10, 0, '', { fontSize: '12px', fontStyle: 'bold' });
            this.costLines.push(line);
            this.tooltip.add(line);
        }

        uiContainer.add([this.skillContainer, this.tooltip]);

        this.createSkillButtons();
        this.setupEventListeners();
        this.refreshSkillTreeUI(); // Initial refresh
    }

    private createSkillButtons() {
        // 1단계: 버튼 객체들을 먼저 생성하여 참조 가능하게 함
        this.skillTreeData.forEach(skill => {
            const x = skill.tree * this.spacingX;
            const y = skill.row * this.spacingY;

            const btn = this.scene.add.container(x, y);
            const bg = this.scene.add.rectangle(0, 0, this.buttonWidth, this.buttonHeight, this.buttonBgColor).setStrokeStyle(3, this.buttonStrokeColor);
            const nameTxt = this.scene.add.text(0, -10, skill.name, { fontSize: '10px', fontStyle: 'bold' }).setOrigin(0.5);
            const lvTxt = this.scene.add.text(0, 15, `Lv. 0/${skill.maxLevel}`, { fontSize: '14px', color: '#00ff00' }).setOrigin(0.5);
            
            (btn as any).skillButtonData = { bg, nameTxt, lvTxt };
            btn.add([bg, nameTxt, lvTxt]);
            btn.setSize(this.buttonWidth, this.buttonHeight).setInteractive({ useHandCursor: true });

            btn.on('pointerdown', () => this.handleSkillUpgrade(skill));
            btn.on('pointerover', (p: any) => {
                const data = (btn as any).skillButtonData;
                if (data) data.bg.setStrokeStyle(3, this.buttonHoverStrokeColor);
                
                const currentLevel = this.gameStats.skillLevels[skill.id];
                const nextLevelEffect = currentLevel < skill.maxLevel ? `\nNext: ${skill.description}` : '\nMax Level';
                
                this.tipText.setText(`${skill.name} (Lv. ${currentLevel}/${skill.maxLevel})${nextLevelEffect}`);
                this.costLines.forEach(l => l.setText('').setVisible(false));

                let currentY = this.tipText.y + this.tipText.height + 10;

                if (currentLevel < skill.maxLevel) {
                    const costs = skill.costs[currentLevel];
                    const resourceTypes: ('wood' | 'rock' | 'iron')[] = ['wood', 'rock', 'iron'];
                    let lineIdx = 0;

                    resourceTypes.forEach(type => {
                        const required = costs[type];
                        if (required) {
                            const current = this.gameStats.collected[type];
                            const isEnough = current >= required;
                            const line = this.costLines[lineIdx++];
                            
                            line.setText(`${type.toUpperCase()}: ${current}/${required}`)
                                .setColor(isEnough ? '#00ff00' : '#ff0000')
                                .setPosition(10, currentY)
                                .setVisible(true);
                            
                            currentY += 18;
                        }
                    });

                    // Add research time line
                    const timeLine = this.costLines[lineIdx++];
                    if (timeLine) {
                        const seconds = skill.researchTimes[currentLevel];
                        timeLine.setText(`Research Time: ${seconds}s`)
                            .setColor('#ffff00')
                            .setPosition(10, currentY)
                            .setVisible(true);
                        currentY += 18;
                    }
                }

                this.tipBg.height = currentY + 10;
                this.tooltip.setVisible(true).setPosition(p.x + 10, p.y + 10);
            });
            btn.on('pointerout', () => {
                const data = (btn as any).skillButtonData;
                if (data) data.bg.setStrokeStyle(3, this.buttonStrokeColor);
                this.tooltip.setVisible(false);
            });

            this.skillButtons[skill.id] = btn;
            this.skillContainer.add(btn);
        });
    }

    private setupEventListeners() {
        this.gameStats.on('updateScore', this.refreshSkillTreeUI, this);
        this.gameStats.on('skillUpgraded', this.onSkillUpgraded, this);
    }

    private isSkillUnlocked(skill: SkillData): boolean {
        if (!skill.prerequisites || skill.prerequisites.length === 0) return true;
        // 모든 선행 조건을 만족해야 함
        return skill.prerequisites.every(pre => this.gameStats.skillLevels[pre.id] >= pre.level);
    }

    private handleSkillUpgrade(skill: SkillData) {
        const currentLevel = this.gameStats.skillLevels[skill.id];
        if (currentLevel >= skill.maxLevel || !this.isSkillUnlocked(skill)) {
            this.scene.cameras.main.flash(200, 255, 0, 0, true); 
            return;
        }

        if (this.gameStats.activeResearch) {
            // Already researching something else
            this.scene.cameras.main.flash(200, 255, 165, 0, true);
            return;
        }

        if (this.gameStats.startResearch(skill)) {
            this.scene.cameras.main.flash(200, 0, 255, 0, true);
        } else {
            this.scene.cameras.main.flash(200, 255, 0, 0, true);
        }
    }

    private refreshSkillTreeUI() {
        this.lineGraphics.clear();

        this.skillTreeData.forEach(skill => {
            const btn = this.skillButtons[skill.id];
            const data = (btn as any).skillButtonData;
            if (!data) return; 
            
            const lv = this.gameStats.skillLevels[skill.id];
            const isUnlocked = this.isSkillUnlocked(skill);
            const currentCosts = lv < skill.maxLevel ? skill.costs[lv] : {};
            const canAfford = this.gameStats.canAfford(currentCosts);
            const isMaxLevel = lv >= skill.maxLevel;
            const isResearching = this.gameStats.activeResearch?.skillId === skill.id;

            if (isResearching) {
                const progress = 1 - (this.gameStats.activeResearch!.remainingTime / this.gameStats.activeResearch!.totalTime);
                data.lvTxt.setText(`Researching... ${Math.floor(progress * 100)}%`);
                data.lvTxt.setColor('#ffff00');
            } else {
                data.lvTxt.setText(`Lv. ${lv}/${skill.maxLevel}`);
                data.lvTxt.setColor(isMaxLevel ? '#ffffff' : '#00ff00');
            }
            
            const { bg, nameTxt, lvTxt } = data;

            if (isResearching) {
                btn.setAlpha(1);
                bg.setFillStyle(0x444400); 
                bg.setStrokeStyle(3, 0xffff00);
                nameTxt.setColor('#ffffff');
                btn.setInteractive({ useHandCursor: false });
            } else if (isMaxLevel) {
                btn.setAlpha(1);
                bg.setFillStyle(0x006600); 
                bg.setStrokeStyle(3, 0x00ff00); 
                nameTxt.setColor('#ffffff');
                btn.disableInteractive(); 
            } else if (!isUnlocked) {
                btn.setAlpha(0.5);
                bg.setFillStyle(this.buttonDisabledBgColor);
                bg.setStrokeStyle(3, this.buttonStrokeColor);
                nameTxt.setColor('#aaaaaa');
                lvTxt.setColor(this.buttonDisabledTextColor);
                btn.setInteractive({ useHandCursor: true }); // Enable interaction for tooltip
            } else if (!canAfford || (this.gameStats.activeResearch && !isResearching)) {
                btn.setAlpha(0.7);
                bg.setFillStyle(this.buttonBgColor);
                bg.setStrokeStyle(3, 0x880000); 
                nameTxt.setColor('#ffffff');
                if (!isResearching) lvTxt.setColor('#ff8888');
                btn.setInteractive({ useHandCursor: true }); 
            } else {
                btn.setAlpha(1);
                bg.setFillStyle(this.buttonBgColor);
                bg.setStrokeStyle(3, this.buttonStrokeColor);
                nameTxt.setColor('#ffffff');
                btn.setInteractive({ useHandCursor: true });
            }

            // Draw prerequisite lines
            if (skill.prerequisites) {
                skill.prerequisites.forEach(pre => {
                    const parentBtn = this.skillButtons[pre.id];
                    if (parentBtn) {
                        const parentSkill = this.skillTreeData.find(s => s.id === pre.id);
                        const parentLevel = parentSkill ? this.gameStats.skillLevels[parentSkill.id] : 0;
                        const isSatisfied = parentLevel >= pre.level;
                        
                        // Calculate start and end points at the edges of buttons
                        const start = this.getEdgePoint(parentBtn, btn);
                        const end = this.getEdgePoint(btn, parentBtn);

                        // Brighten colors for dark background: Active (Green), Inactive (Lighter Grey)
                        this.lineGraphics.lineStyle(2, isSatisfied ? 0x00ff00 : 0x555555, isSatisfied ? 1.0 : 0.4);
                        this.lineGraphics.lineBetween(start.x, start.y, end.x, end.y);
                    }
                });
            }
        });
    }

    private getEdgePoint(from: Phaser.GameObjects.Container, to: Phaser.GameObjects.Container) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx);
        
        // Rect dimensions are 100x60, so half is 50x30
        const halfW = 50;
        const halfH = 30;
        
        // Find which edge the line intersects
        const absCos = Math.abs(Math.cos(angle));
        const absSin = Math.abs(Math.sin(angle));
        
        let x, y;
        if (halfW * absSin <= halfH * absCos) {
            // Hits left or right edge
            x = from.x + (dx > 0 ? halfW : -halfW);
            y = from.y + (dx > 0 ? halfW : -halfW) * Math.tan(angle);
        } else {
            // Hits top or bottom edge
            // Avoid division by zero
            const tan = Math.tan(angle);
            x = from.x + (dy > 0 ? halfH : -halfH) / (tan === 0 ? 0.0001 : tan);
            y = from.y + (dy > 0 ? halfH : -halfH);
        }
        
        return { x, y };
    }

    private onSkillUpgraded(skillId: string) {
        const btn = this.skillButtons[skillId];
        if (!btn) return;
        const data = (btn as any).skillButtonData;
        if (!data || !data.bg) return;
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