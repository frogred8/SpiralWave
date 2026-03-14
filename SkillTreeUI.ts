import Phaser from 'phaser';
import { I18n } from './I18n';
import { SkillData } from './SkillData';
import { GameStats } from './GameStats';
import { INITIAL_STATS, UI_CONFIG, RESOURCE_CONFIG } from './Constants';
import { Utils } from './Utils';

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
    public skillTreeData: SkillData[];

    constructor(scene: Phaser.Scene, uiContainer: Phaser.GameObjects.Container, gameStats: GameStats, skillTreeData: SkillData[]) {
        this.scene = scene;
        this.gameStats = gameStats;
        this.skillTreeData = skillTreeData;

        this.skillContainer = this.scene.add.container(UI_CONFIG.SKILL_TREE.START_X, UI_CONFIG.SKILL_TREE.START_Y);
        this.lineGraphics = this.scene.add.graphics();
        this.skillContainer.add(this.lineGraphics);

        // 툴팁 구성 요소 초기화
        this.tooltip = this.scene.add.container(0, 0).setVisible(false).setDepth(100);
        this.tipBg = this.scene.add.rectangle(0, 0, UI_CONFIG.TOOLTIP.WIDTH, 100, UI_CONFIG.TOOLTIP.BG_COLOR, UI_CONFIG.TOOLTIP.ALPHA).setStrokeStyle(2, UI_CONFIG.TOOLTIP.STROKE_COLOR).setOrigin(0);
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
            const x = skill.tree * UI_CONFIG.BUTTON.SPACING_X;
            const y = skill.row * UI_CONFIG.BUTTON.SPACING_Y;

            const btn = this.scene.add.container(x, y);
            const bg = this.scene.add.rectangle(0, 0, UI_CONFIG.BUTTON.WIDTH, UI_CONFIG.BUTTON.HEIGHT, UI_CONFIG.BUTTON.BG_COLOR).setStrokeStyle(3, UI_CONFIG.BUTTON.STROKE_COLOR);
            
            const skillName = I18n.t(`skill.${skill.id}.name`);
            const nameTxt = this.scene.add.text(0, -10, skillName, { fontSize: '14px', fontStyle: 'bold' }).setOrigin(0.5);
            this.adjustFontSize(nameTxt, UI_CONFIG.BUTTON.WIDTH - 10);

            const lvTxt = this.scene.add.text(0, 15, `${I18n.t('skill.level')} 0/${skill.maxLevel}`, { fontSize: '14px', color: '#00ff00' }).setOrigin(0.5);
            
            (btn as any).skillButtonData = { bg, nameTxt, lvTxt };
            btn.add([bg, nameTxt, lvTxt]);
            btn.setSize(UI_CONFIG.BUTTON.WIDTH, UI_CONFIG.BUTTON.HEIGHT).setInteractive({ useHandCursor: true });

            btn.on('pointerdown', () => this.handleSkillUpgrade(skill));
            btn.on('pointerover', (p: any) => {
                const data = (btn as any).skillButtonData;
                if (data) data.bg.setStrokeStyle(3, UI_CONFIG.BUTTON.HOVER_STROKE_COLOR);
                
                const currentLevel = this.gameStats.skillLevels[skill.id];
                const isMaxLevel = currentLevel >= skill.maxLevel;
                
                const dynamicDesc = this.getDynamicDescription(skill, currentLevel);
                this.tipText.setText(`${dynamicDesc}`);
                
                this.costLines.forEach(l => l.setText('').setVisible(false));

                let currentY = this.tipText.y + this.tipText.height + 10;
                let lineIdx = 0;

                // Add prerequisites (Always show if not satisfied or if still upgrading)
                if (skill.prerequisites && skill.prerequisites.length > 0 && !isMaxLevel) {
                    const prereqTitle = this.costLines[lineIdx++];
                    prereqTitle.setText(I18n.t('skill.prerequisites'))
                        .setColor('#cccccc')
                        .setPosition(10, currentY)
                        .setVisible(true);
                    currentY += 18;

                    skill.prerequisites.forEach(pre => {
                        const preSkill = this.skillTreeData.find(s => s.id === pre.id);
                        const currentPreLevel = this.gameStats.skillLevels[pre.id];
                        const isSatisfied = currentPreLevel >= pre.level;
                        const line = this.costLines[lineIdx++];
                        
                        if (line && preSkill) {
                            line.setText(` - ${I18n.t(`skill.${preSkill.id}.name`)} Lv.${pre.level}`)
                                .setColor(isSatisfied ? '#00ff00' : '#ff0000')
                                .setPosition(10, currentY)
                                .setVisible(true);
                            currentY += 18;
                        }
                    });
                    currentY += 5; // Extra padding
                }

                if (!isMaxLevel) {
                    const costs = skill.costs[currentLevel];
                    const resourceTypes: ('wood' | 'rock')[] = ['wood', 'rock'];

                    if (costs) {
                        resourceTypes.forEach(type => {
                            const required = costs[type];
                            if (required) {
                                const current = this.gameStats.collected[type];
                                const isEnough = current >= required;
                                const line = this.costLines[lineIdx++];
                                
                                if (line) {
                                    const icon = RESOURCE_CONFIG.ICONS[type as keyof typeof RESOURCE_CONFIG.ICONS] || '';
                                    line.setText(`${icon} ${current}/${required}`)
                                        .setColor(isEnough ? '#00ff00' : '#ff0000')
                                        .setPosition(10, currentY)
                                        .setVisible(true);
                                    
                                    currentY += 18;
                                }
                            }
                        });
                    }

                    // Add research time line
                    const timeLine = this.costLines[lineIdx++];
                    if (timeLine) {
                        const seconds = (skill.researchTimes && skill.researchTimes[currentLevel]) || 0;
                        timeLine.setText(`${I18n.t('skill.research_time')} ${seconds}s`)
                            .setColor('#ffff00')
                            .setPosition(10, currentY)
                            .setVisible(true);
                        currentY += 18;
                    }
                } else {
                    // Max Level specific message
                    const maxLine = this.costLines[lineIdx++];
                    if (maxLine) {
                        maxLine.setText(I18n.t('skill.max_level'))
                            .setColor('#00ff00')
                            .setPosition(10, currentY)
                            .setVisible(true);
                        currentY += 18;
                    }
                }

                // 배경 크기 및 외곽선 업데이트
                this.tipBg.setSize(200, currentY + 10);
                this.tooltip.setVisible(true).setPosition(p.x + 10, p.y + 10);
            });
            btn.on('pointerout', () => {
                const data = (btn as any).skillButtonData;
                if (data) data.bg.setStrokeStyle(3, UI_CONFIG.BUTTON.STROKE_COLOR);
                this.tooltip.setVisible(false);
            });

            this.skillButtons[skill.id] = btn;
            this.skillContainer.add(btn);
        });
    }

    private setupEventListeners() {
        this.gameStats.on(GameStats.EVENTS.UPDATE_SCORE, this.refreshSkillTreeUI, this);
        this.gameStats.on(GameStats.EVENTS.SKILL_UPGRADED, this.onSkillUpgraded, this);
        this.gameStats.on(GameStats.EVENTS.RESEARCH_REDUCED, this.onResearchTimeReduced, this);
    }

    public destroy() {
        this.gameStats.off(GameStats.EVENTS.UPDATE_SCORE, this.refreshSkillTreeUI, this);
        this.gameStats.off(GameStats.EVENTS.SKILL_UPGRADED, this.onSkillUpgraded, this);
        this.gameStats.off(GameStats.EVENTS.RESEARCH_REDUCED, this.onResearchTimeReduced, this);
    }

    private onResearchTimeReduced(skillId: string) {
        const btn = this.skillButtons[skillId];
        if (!btn) return;
        const data = (btn as any).skillButtonData;
        if (!data || !data.bg) return;
        
        // 버튼 주변에 살짝 빛나는 후광 효과 추가
        const glow = this.scene.add.rectangle(btn.x, btn.y, UI_CONFIG.BUTTON.WIDTH + 10, UI_CONFIG.BUTTON.HEIGHT + 10, 0x00ffff, 0.7)
            .setOrigin(0.5)
            .setDepth(btn.depth - 1);
        this.skillContainer.add(glow);
        this.skillContainer.sendToBack(glow);

        // 반짝임 및 후광 애니메이션
        this.scene.tweens.add({
            targets: glow,
            alpha: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 400,
            ease: 'Sine.easeOut',
            onComplete: () => glow.destroy()
        });
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

        // Check if already in queue
        const researchIndex = this.gameStats.activeResearches.findIndex(r => r.skillId === skill.id);
        if (researchIndex !== -1) {
            const { isActiveResearch } = this.getResearchState(researchIndex);
            // Cancel research if already in queue
            if (!isActiveResearch &&this.gameStats.cancelResearch(skill)) {
                this.scene.cameras.main.flash(200, 255, 165, 0, true); // Orange flash for cancel
            }
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

        let queueIndex = 0;
        this.skillTreeData.forEach(skill => {
            const btn = this.skillButtons[skill.id];
            if (!btn) return;
            const data = (btn as any).skillButtonData;
            if (!data) return; 

            // 언어 변경 등으로 이름이 바뀌었을 수 있으므로 갱신
            const skillName = I18n.t(`skill.${skill.id}.name`);
            data.nameTxt.setText(skillName);
            this.adjustFontSize(data.nameTxt, UI_CONFIG.BUTTON.WIDTH - 10);
            
            const lv = this.gameStats.skillLevels[skill.id];
            const isUnlocked = this.isSkillUnlocked(skill);
            const currentCosts = lv < skill.maxLevel ? skill.costs[lv] : {};
            const canAfford = this.gameStats.canAfford(currentCosts);
            const isMaxLevel = lv >= skill.maxLevel;
            
            const researchIndex = this.gameStats.activeResearches.findIndex(r => r.skillId === skill.id);
            const { isActiveResearch, isResearching } = this.getResearchState(researchIndex);


            if (isActiveResearch) {
                const research = this.gameStats.activeResearches[researchIndex];
                const progress = 1 - (research.remainingTime / research.totalTime);
                data.lvTxt.setText(`${Math.ceil(research.remainingTime)}s (${Math.floor(progress * 100)}%)`);
                data.lvTxt.setColor('#ffff00');
            } else if (isResearching) {
                queueIndex++;
                data.lvTxt.setText(`${I18n.t('skill.queued')} (${researchIndex - this.gameStats.maxResearchSlots + 1})`);
                data.lvTxt.setColor('#00ffff');
            } else {
                data.lvTxt.setText(`${I18n.t('skill.level')} ${lv}/${skill.maxLevel}`);
                data.lvTxt.setColor(isMaxLevel ? '#ffffff' : '#00ff00');
            }
            
            const { bg, nameTxt, lvTxt } = data;

            if (isResearching) {
                btn.setAlpha(1);
                bg.setFillStyle(isActiveResearch ? 0x444400 : 0x004444); 
                bg.setStrokeStyle(3, isActiveResearch ? 0xffff00 : 0x00ffff);
                nameTxt.setColor('#ffffff');
                btn.setInteractive({ useHandCursor: false });
            } else if (isMaxLevel) {
                btn.setAlpha(1);
                bg.setFillStyle(0x006600); 
                bg.setStrokeStyle(3, 0x00ff00); 
                nameTxt.setColor('#ffffff');
                // 인터랙션은 유지하되(툴팁용), 클릭 손가락 커서는 비활성화
                btn.setInteractive({ useHandCursor: false }); 
            } else if (!isUnlocked) {
                btn.setAlpha(0.5);
                bg.setFillStyle(UI_CONFIG.BUTTON.DISABLED_BG_COLOR);
                bg.setStrokeStyle(3, UI_CONFIG.BUTTON.STROKE_COLOR);
                nameTxt.setColor('#aaaaaa');
                lvTxt.setColor(UI_CONFIG.BUTTON.DISABLED_TEXT_COLOR);
                btn.setInteractive({ useHandCursor: true }); // Enable interaction for tooltip
            } else if (!canAfford) {
                btn.setAlpha(0.7);
                bg.setFillStyle(UI_CONFIG.BUTTON.BG_COLOR);
                bg.setStrokeStyle(3, 0x880000); 
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#ff8888');
                btn.setInteractive({ useHandCursor: true }); 
            } else {
                btn.setAlpha(1);
                bg.setFillStyle(UI_CONFIG.BUTTON.BG_COLOR);
                bg.setStrokeStyle(3, UI_CONFIG.BUTTON.STROKE_COLOR);
                nameTxt.setColor('#ffffff');
                btn.setInteractive({ useHandCursor: true });
            }

            // Draw prerequisite lines
            if (skill.prerequisites) {
                skill.prerequisites.forEach(pre => {
                    const parentBtn = this.skillButtons[pre.id];
                    // Only draw line if parent skill is also in the current randomized tree
                    if (parentBtn && this.skillButtons[skill.id]) {
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

    private getResearchState(researchIndex: number) {
        const isResearching = researchIndex !== -1;
        const isActiveResearch = isResearching && researchIndex < this.gameStats.maxResearchSlots;
        return { isActiveResearch, isResearching };
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
            const edgeX = (dx > 0 ? halfW : -halfW);
            x = from.x + edgeX;
            y = from.y + edgeX * Math.tan(angle);
        } else {
            // Hits top or bottom edge
            // Avoid division by zero
            const edgeY = (dy > 0 ? halfH : -halfH);
            const tan = Math.tan(angle);
            x = from.x + edgeY / (tan === 0 ? 0.0001 : tan);
            y = from.y + edgeY;
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

    private adjustFontSize(textObj: Phaser.GameObjects.Text, maxWidth: number) {
        let fontSize = 14;
        textObj.setFontSize(`${fontSize}px`);
        
        while (textObj.width > maxWidth && fontSize > 8) {
            fontSize--;
            textObj.setFontSize(`${fontSize}px`);
        }
    }

    private getDynamicDescription(skill: SkillData, level: number): string {
        const skillName = I18n.t(`skill.${skill.id}.name`);
        const skillDescTemplate = I18n.t(`skill.${skill.id}.desc`);
        
        let text = `${skillName} (${I18n.t('skill.level')} ${level}/${skill.maxLevel})\n`;
        const isMaxLevel = level >= skill.maxLevel;
        if (isMaxLevel) {
            const propertyName = this.getPropertyName(skill.effectProperty);
            const bonusVal = this.getFormattedBonus(skill, level);
            return `${text}${propertyName} ${bonusVal}`;
        }

        const currentVal = this.getFormattedValue(skill, level);
        const nextVal = this.getFormattedValue(skill, level + 1);
        
        // 숫자가 포함된 부분(+1, 0.5, 3%, 0.2x, 15° 등)을 찾아 "현재값 -> 다음값"으로 변환
        const regex = /([+-]?\d+(?:\.\d+)?)([xX%°]?)/i;
        if (regex.test(skillDescTemplate)) {
            return `${text}${skillDescTemplate.replace(regex, `${currentVal} -> ${nextVal}`)}`;
        }

        
        return `${text}${skillDescTemplate}`;
    }

    private getFormattedValue(skill: SkillData, level: number): string {
        const base = this.getInitialValue(skill.effectProperty);
        const total = base + (skill.effectValue * level);        
        return Utils.formatStatValue(skill.effectProperty, total, level);
    }

    private getInitialValue(property: string): number {
        switch(property) {
            case 'radius': return INITIAL_STATS.RADIUS;
            case 'force': return INITIAL_STATS.FORCE;
            case 'highDimProb': return INITIAL_STATS.HIGH_DIM_PROB;
            case 'maxArms': return INITIAL_STATS.MAX_ARMS;
            case 'autoArm': return 0;
            case 'armSpeed': return INITIAL_STATS.ARM_SPEED_FACTOR;
            case 'maxResearchSlots': return INITIAL_STATS.MAX_RESEARCH_SLOTS;
            case 'spawnRate': return INITIAL_STATS.SPAWN_RATE_FACTOR;
            case 'researchBonus': return INITIAL_STATS.RESEARCH_BONUS;
            case 'moveSpeed': return INITIAL_STATS.MOVE_SPEED;
            case 'net': return 0;
            default: return 0;
        }
    }

    private getPropertyName(property: string): string {
        switch(property) {
            case 'radius': return I18n.t('prop.radius');
            case 'force': return I18n.t('prop.force');
            case 'highDimProb': return I18n.t('prop.highDimProb');
            case 'maxArms': return I18n.t('prop.maxArms');
            case 'autoArm': return I18n.t('prop.autoArm');
            case 'armSpeed': return I18n.t('prop.armSpeed');
            case 'maxResearchSlots': return I18n.t('prop.maxResearchSlots');
            case 'spawnRate': return I18n.t('prop.spawnRate');
            case 'researchBonus': return I18n.t('prop.researchBonus');
            case 'moveSpeed': return I18n.t('prop.moveSpeed');
            case 'net': return I18n.t('prop.net');
            case 'netAngle': return I18n.t('prop.netAngle');
            default: return property;
        }
    }

    private getFormattedBonus(skill: SkillData, level: number): string {
        const bonus = skill.effectValue * level;
        return Utils.formatBonusValue(skill.effectProperty, bonus, level);
    }

    public playBoosterAnimation(onComplete: (addedTime: number) => void) {
        // 최대 레벨에 도달한 스킬들을 찾아서 row(0~3) 기준으로 정렬
        const maxedSkills = this.skillTreeData.filter(s => this.gameStats.skillLevels[s.id] >= s.maxLevel);
        maxedSkills.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.tree - b.tree;
        });

        if (maxedSkills.length === 0) {
            onComplete(0);
            return;
        }

        let addedTime = 0;
        let delay = 0;
        const animationStep = 400; // 각 스킬당 400ms

        maxedSkills.forEach((skill, index) => {
            this.scene.time.delayedCall(delay, () => {
                const btn = this.skillButtons[skill.id];
                if (btn) {
                    addedTime += 2; // 스킬당 2초 추가

                    // 버튼 강조 트윈
                    this.scene.tweens.add({
                        targets: btn,
                        scaleX: 1.15,
                        scaleY: 1.15,
                        duration: 150,
                        yoyo: true,
                        ease: 'Quad.easeInOut'
                    });

                    // "+2s" 플로팅 텍스트 생성
                    const ft = this.scene.add.text(btn.x, btn.y - 20, '+2s', {
                        fontSize: '24px',
                        color: '#ffff00',
                        fontStyle: 'bold',
                        stroke: '#000000',
                        strokeThickness: 4
                    }).setOrigin(0.5).setDepth(200);

                    this.skillContainer.add(ft);

                    this.scene.tweens.add({
                        targets: ft,
                        y: btn.y - 60,
                        alpha: 0,
                        duration: 800,
                        ease: 'Sine.easeOut',
                        onComplete: () => ft.destroy()
                    });

                    // (선택 사항) 화면 중앙 타이머 업데이트를 위해 이벤트를 강제로 발생시키거나,
                    // GameStats에 중간중간 더해주면 되지만, 여기서는 최종에 한 번에 더함.
                }

                // 마지막 스킬 애니메이션이 끝나면 콜백 호출
                if (index === maxedSkills.length - 1) {
                    this.scene.time.delayedCall(800, () => {
                        // 부스터 시간이 있으면 1초 추가
                        if (addedTime > 0) {
                            addedTime += 1;
                        }
                        onComplete(addedTime);
                    });
                }
            });
            delay += animationStep;
        });
    }
    }