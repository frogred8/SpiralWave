import Phaser from 'phaser';
import { I18n } from '@shared/I18n';
import { SkillData } from '@shared/SkillData';
import { GameStats } from './GameStats';
import { INITIAL_STATS, UI_CONFIG, RESOURCE_CONFIG } from '@shared/Constants';
import { Utils } from './Utils';
import { SoundManager } from './SoundManager';

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
            const nameTxt = this.scene.add.text(0, -10, skillName, { fontSize: '14px', fontStyle: 'bold' })
                .setOrigin(0.5)
                .setPadding({ top: 2, bottom: 2 });
            Utils.adjustFontSize(nameTxt, UI_CONFIG.BUTTON.WIDTH - 10);

            const lvTxt = this.scene.add.text(0, 15, `${I18n.t('skill.level')} 0/${skill.maxLevel}`, { 
                fontSize: '14px', 
                color: '#00ff00',
                align: 'center'
            })
                .setOrigin(0.5)
                .setPadding({ top: 2, bottom: 2 });
            
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
                        timeLine.setText(`${I18n.t('skill.research_time')} ${seconds}${I18n.t('unit.second')}`)
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
        return this.gameStats.isSkillUnlocked(skill);
    }

    private handleSkillUpgrade(skill: SkillData) {
        const currentLevel = this.gameStats.skillLevels[skill.id];
        if (currentLevel >= skill.maxLevel || !this.isSkillUnlocked(skill)) {
            this.scene.cameras.main.flash(200, 255, 0, 0, true); 
            return;
        }

        // Check if already in queue or active
        const { isResearching, isActiveResearch } = this.getResearchState(skill);
        if (isResearching) {
            // Cancel research if already in queue (not active yet)
            if (!isActiveResearch && this.gameStats.cancelResearch(skill)) {
                this.scene.cameras.main.flash(200, 255, 165, 0, true); // Orange flash for cancel
            }
            return;
        }

        if (this.gameStats.startResearch(skill)) {
            this.scene.cameras.main.flash(200, 0, 255, 0, true);
            SoundManager.getInstance().play('skillupgrade');
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
            Utils.adjustFontSize(data.nameTxt, UI_CONFIG.BUTTON.WIDTH - 10);
            
            const lv = this.gameStats.skillLevels[skill.id];
            const isUnlocked = this.isSkillUnlocked(skill);
            // 현재 레벨로만 해금되었는지 여부 (연구 대기 제외)
            const isActuallyUnlocked = !skill.prerequisites || skill.prerequisites.length === 0 || 
                                       skill.prerequisites.every(pre => this.gameStats.skillLevels[pre.id] >= pre.level);
            const isUnlockedByResearch = !isActuallyUnlocked && isUnlocked;

            const currentCosts = lv < skill.maxLevel ? skill.costs[lv] : {};
            const canAfford = this.gameStats.canAfford(currentCosts);
            const isMaxLevel = lv >= skill.maxLevel;
            
            const { isActiveResearch, isResearching, isQueued, activeIndex, queueIndex } = this.getResearchState(skill);


            if (isActiveResearch) {
                const research = this.gameStats.activeResearches[activeIndex];
                data.lvTxt.setText(`${Math.ceil(research.remainingTime)}${I18n.t('unit.second')}`);
                data.lvTxt.setColor('#ffff00');
            } else if (isQueued) {
                const isWaitingForPrereq = !this.gameStats.isSkillUnlocked(skill, true);
                if (isWaitingForPrereq) {
                    data.lvTxt.setText(`${I18n.t('skill.queued')}(${queueIndex + 1})\n${I18n.t('skill.waiting')}`);
                } else {
                    data.lvTxt.setText(`${I18n.t('skill.queued')}(${queueIndex + 1})`);
                }
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
                btn.setInteractive({ useHandCursor: !isActiveResearch }); // Only queued items can be canceled
            } else if (isMaxLevel) {
                btn.setAlpha(1);
                bg.setFillStyle(0x006600); 
                bg.setStrokeStyle(3, 0x00ff00); 
                nameTxt.setColor('#ffffff');
                btn.setInteractive({ useHandCursor: false }); 
            } else if (!isUnlocked) {
                btn.setAlpha(0.5);
                bg.setFillStyle(UI_CONFIG.BUTTON.DISABLED_BG_COLOR);
                bg.setStrokeStyle(3, UI_CONFIG.BUTTON.STROKE_COLOR);
                nameTxt.setColor('#aaaaaa');
                lvTxt.setColor(UI_CONFIG.BUTTON.DISABLED_TEXT_COLOR);
                btn.setInteractive({ useHandCursor: true }); 
            } else if (!canAfford) {
                btn.setAlpha(0.7);
                bg.setFillStyle(UI_CONFIG.BUTTON.BG_COLOR);
                bg.setStrokeStyle(3, 0x880000); 
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#ff8888');
                btn.setInteractive({ useHandCursor: true }); 
            } else if (isUnlockedByResearch) {
                // 연구 중인 스킬로 인해 배울 수 있는 상태 (노란색 강조)
                btn.setAlpha(0.8);
                bg.setFillStyle(UI_CONFIG.BUTTON.BG_COLOR);
                bg.setStrokeStyle(3, 0xffff00);
                nameTxt.setColor('#ffffff');
                lvTxt.setColor('#ffff00');
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
                    if (parentBtn && this.skillButtons[skill.id]) {
                        const parentLevel = this.gameStats.skillLevels[pre.id] || 0;
                        const isSatisfied = parentLevel >= pre.level;
                        const isParentBeingResearched = this.gameStats.activeResearches.some(r => r.skillId === pre.id) || 
                                                       this.gameStats.researchQueue.some(r => r.skillId === pre.id);
                        const isSatisfiedByResearch = !isSatisfied && isParentBeingResearched && (parentLevel + 1 >= pre.level);
                        
                        const start = this.getEdgePoint(parentBtn, btn);
                        const end = this.getEdgePoint(btn, parentBtn);

                        let color = 0x555555;
                        let alpha = 0.4;

                        if (isSatisfied) {
                            color = 0x00ff00; // Green
                            alpha = 1.0;
                        } else if (isSatisfiedByResearch) {
                            color = 0xffff00; // Yellow
                            alpha = 0.8;
                        }

                        this.lineGraphics.lineStyle(2, color, alpha);
                        this.lineGraphics.lineBetween(start.x, start.y, end.x, end.y);
                    }
                });
            }
        });
    }

    private getResearchState(skill: SkillData) {
        const activeIndex = this.gameStats.activeResearches.findIndex(r => r.skillId === skill.id);
        const queueIndex = this.gameStats.researchQueue.findIndex(r => r.skillId === skill.id);
        
        const isResearching = activeIndex !== -1 || queueIndex !== -1;
        const isActiveResearch = activeIndex !== -1;
        const isQueued = queueIndex !== -1;

        return { isActiveResearch, isResearching, isQueued, activeIndex, queueIndex };
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

    private getDynamicDescription(skill: SkillData, level: number): string {
        const skillName = I18n.t(`skill.${skill.id}.name`);
        const skillDescTemplate = I18n.t(`skill.${skill.id}.desc`);
        
        let text = `${skillName} (${I18n.t('skill.level')} ${level}/${skill.maxLevel})\n`;
        if (skill.kind === 'active' && skill.active) {
            const currentDamage = skill.active.damage + Math.max(0, level - 1);
            const nextDamage = skill.active.damage + Math.min(skill.maxLevel - 1, level);
            const currentRange = skill.active.range + (Math.max(0, level - 1) * 25);
            const nextRange = skill.active.range + (Math.min(skill.maxLevel - 1, level) * 25);
            const cooldown = (skill.active.cooldownMs / 1000).toFixed(0);
            const manaCost = skill.active.manaCost;

            if (level >= skill.maxLevel) {
                return `${text}${skillDescTemplate}\nDMG ${currentDamage} / RNG ${currentRange} / MP ${manaCost} / CD ${cooldown}s`;
            }

            return `${text}${skillDescTemplate}\nDMG ${currentDamage} -> ${nextDamage} / RNG ${currentRange} -> ${nextRange} / MP ${manaCost} / CD ${cooldown}s`;
        }

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
            case 'satelliteCount': return 0;
            case 'maxMana': return INITIAL_STATS.MAX_MANA;
            case 'manaRegen': return INITIAL_STATS.MANA_REGEN;
            case 'activeSkillDamage': return INITIAL_STATS.ACTIVE_SKILL_DAMAGE_BONUS;
            case 'activeSkillRange': return INITIAL_STATS.ACTIVE_SKILL_RANGE_BONUS;
            case 'activeSkillCooldownReduction': return INITIAL_STATS.ACTIVE_SKILL_COOLDOWN_REDUCTION;
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
            case 'satelliteCount': return I18n.t('prop.satelliteCount');
            case 'smallBlackHole': return I18n.t('prop.smallBlackHole');
            case 'smallBlackHoleRange': return I18n.t('prop.smallBlackHoleRange');
            case 'netLength': return I18n.t('prop.netLength');
            case 'specialItemBooster': return I18n.t('prop.specialItemBooster');
            case 'maxMana': return I18n.t('prop.maxMana');
            case 'manaRegen': return I18n.t('prop.manaRegen');
            case 'activeSkillDamage': return I18n.t('prop.activeSkillDamage');
            case 'activeSkillRange': return I18n.t('prop.activeSkillRange');
            case 'activeSkillCooldownReduction': return I18n.t('prop.activeSkillCooldownReduction');
            case 'activeCombatSkill': return I18n.t('prop.activeCombatSkill');
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
                    const ft = this.scene.add.text(btn.x, btn.y - 20, '+2' + I18n.t('unit.second'), {
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
