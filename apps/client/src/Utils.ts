import Phaser from 'phaser';
import { I18n } from '@shared/I18n';
import { SKILL_TREE_CONFIG } from '@shared/Constants';

/**
 * 게임 전반에서 사용되는 유틸리티 함수들
 */
export const Utils = {
    /**
     * 스킬 트리 데이터를 랜덤하게 배치하고 의존성을 설정합니다.
     */
    generateRandomSkillTree(skillData: any[]): any[] {
        if (!skillData || skillData.length < SKILL_TREE_CONFIG.TOTAL_SKILLS) return skillData;

        // 1. 위치 풀 생성
        const positions: { tree: number, row: number }[] = [];
        for (let r = 0; r < SKILL_TREE_CONFIG.ROWS; r++) {
            for (let t = 0; t < SKILL_TREE_CONFIG.TREES; t++) {
                positions.push({ tree: t, row: r });
            }
        }

        // 2. 스킬 데이터 셔플 및 선택
        const shuffledSkills = Phaser.Utils.Array.Shuffle([...skillData]).slice(0, SKILL_TREE_CONFIG.TOTAL_SKILLS);

        // 3. 스킬에 위치 할당 및 초기 Prerequisites 제거
        shuffledSkills.forEach((skill: any, index: number) => {
            const pos = positions[index];
            skill.tree = pos.tree;
            skill.row = pos.row;
            skill.prerequisites = []; // 기존 의존성 초기화
        });

        // 4. 새로운 Prerequisites 생성 로직
        for (let r = 1; r < SKILL_TREE_CONFIG.ROWS; r++) {
            // 이 row에 있는 스킬들
            const currentRows = shuffledSkills.filter((s: any) => s.row === r);
            // 바로 위 row에 있는 스킬들
            const upperRows = shuffledSkills.filter((s: any) => s.row === r - 1);

            // 해당 row에서 랜덤하게 하나 선택하여 추가 의존성(2개)을 부여할 대상 선정
            const multiPrereqIndex = Phaser.Math.Between(0, currentRows.length - 1);

            currentRows.forEach((skill: any, index: number) => {
                // 기본 규칙: 자신의 바로 위 tree의 스킬을 선행 조건으로 포함
                const directUpper = upperRows.find((s: any) => s.tree === skill.tree);
                if (directUpper && !skill.prerequisites.some((p: any) => p.id === directUpper.id)) {
                    skill.prerequisites.push({ id: directUpper.id, level: 1 });
                }

                // 랜덤 규칙: row마다 하나는 이웃한 tree의 상위 스킬을 추가로 포함 (이웃: 인덱스 차이가 1)
                if (index === multiPrereqIndex) {
                    const otherUpper = upperRows.filter((s: any) =>
                        Math.abs(s.tree - skill.tree) === 1 &&
                        !skill.prerequisites.some((p: any) => p.id === s.id)
                    );
                    if (otherUpper.length > 0) {
                        const randomUpper = Phaser.Utils.Array.GetRandom(otherUpper) as any;
                        skill.prerequisites.push({ id: randomUpper.id, level: 1 });
                    }
                }
            });

            // 마지막 row인 경우, 추가로 이웃한 tree의 연결 하나 더 생성 (기존에 연결 가능한 대상이 있는지 확인)
            if (r === SKILL_TREE_CONFIG.ROWS - 1) {
                const potentialSkills = currentRows.filter((skill: any) =>
                    upperRows.some((up: any) =>
                        Math.abs(up.tree - skill.tree) === 1 &&
                        !skill.prerequisites.some((p: any) => p.id === up.id)
                    )
                );

                if (potentialSkills.length > 0) {
                    const randomSkill = Phaser.Utils.Array.GetRandom(potentialSkills) as any;
                    const otherUpper = upperRows.filter((s: any) =>
                        Math.abs(s.tree - randomSkill.tree) === 1 &&
                        !randomSkill.prerequisites.some((p: any) => p.id === s.id)
                    );
                    const extraUpper = Phaser.Utils.Array.GetRandom(otherUpper) as any;
                    if (extraUpper) {
                        randomSkill.prerequisites.push({ id: extraUpper.id, level: 1 });
                    }
                }
            }
        }
        return shuffledSkills;
    },

    /**
     * 두 지점 사이의 거리를 계산합니다.
     */
    getDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Phaser.Math.Distance.Between(x1, y1, x2, y2);
    },

    /**
     * 두 지점 사이의 각도를 라디안으로 계산합니다.
     */
    getAngle(x1: number, y1: number, x2: number, y2: number): number {
        return Phaser.Math.Angle.Between(x1, y1, x2, y2);
    },

    /**
     * 화면 가장자리(Top, Right, Bottom, Left) 중 한 곳의 무작위 좌표를 반환합니다.
     */
    getRandomEdgePosition(width: number, height: number): { x: number, y: number } {
        const edge = Phaser.Math.Between(0, 3);
        let x = 0, y = 0;
        if (edge === 0) { // Top
            x = Phaser.Math.Between(0, width);
            y = 0;
        } else if (edge === 1) { // Right
            x = width;
            y = Phaser.Math.Between(0, height);
        } else if (edge === 2) { // Bottom
            x = Phaser.Math.Between(0, width);
            y = height;
        } else { // Left
            x = 0;
            y = Phaser.Math.Between(0, height);
        }
        return { x, y };
    },

    /**
     * 스탯 속성에 따른 포맷팅된 문자열을 반환합니다.
     */
    formatStatValue(property: string, value: number, level: number): string {
        switch (property) {
            case 'radius': return `${Math.floor(value)}`;
            case 'force': return `${value.toFixed(1)}`;
            case 'highDimProb': return `${(value * 100).toFixed(0)}%`;
            case 'maxArms': return `${value}`;
            case 'autoArm': return level > 0 ? I18n.t('ui.on') : I18n.t('ui.off');
            case 'armSpeed': return `${value.toFixed(1)}x`;
            case 'maxResearchSlots': return `${value}`;
            case 'spawnRate': return `${value.toFixed(1)}x`;
            case 'moveSpeed': return `${value.toFixed(2)}`;
            case 'netAngle': return `${value}°`;
            case 'satelliteCount': return `${value}`;
            default: return `${value}`;
        }
    },

    /**
     * 스탯 속성에 따른 보너스 수치를 포맷팅하여 반환합니다.
     */
    formatBonusValue(property: string, bonus: number, level: number): string {
        const sign = bonus >= 0 ? '+' : '';
        switch (property) {
            case 'highDimProb': return `${sign}${(bonus * 100).toFixed(0)}%`;
            case 'autoArm': return level > 0 ? I18n.t('ui.enabled') : I18n.t('ui.disabled');
            case 'net': return level > 0 ? I18n.t('ui.activated') : I18n.t('ui.locked');
            case 'armSpeed':
            case 'spawnRate': return `${sign}${bonus.toFixed(1)}x`;
            case 'researchBonus': return `${bonus}${I18n.t('unit.second')}`;
            case 'netAngle': return `${sign}${bonus}°`;
            case 'satelliteCount': return `${sign}${bonus}`;
            default: return `${sign}${bonus % 1 === 0 ? bonus : bonus.toFixed(2)}`;
        }
    },

    /**
     * 중력 및 나선형 이동을 적용합니다.
     */
    applyGravityToPoint(res: any, dist: number, radius: number, targetX: number, targetY: number, force: number, accelBase: number, dragBase: number) {
        const dx = targetX - res.x;
        const dy = targetY - res.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        const dirX = dx / mag;
        const dirY = dy / mag;

        const tangentX = -dirY;
        const tangentY = dirX;

        const gravityForce = (1 - (dist / radius)) * force * accelBase;
        const boost = dist < 150 ? Math.pow((150 - dist) / 150, 2) * 5 : 0;
        const accel = gravityForce * (1 + boost);
        const spiral = 0.2 * Math.pow(dist / radius, 2);

        res.body.velocity.x += (dirX * accel + tangentX * accel * spiral);
        res.body.velocity.y += (dirY * accel + tangentY * accel * spiral);

        res.body.setDrag(dist < 150 ? dragBase * res.body.mass : 0);
    },

    /**
     * 객체의 속도를 제한합니다.
     */
    limitSpeed(res: any, dist: number, minNear: number, minNormal: number, maxSpeed: number) {
        const min = dist < 100 ? minNear : minNormal;
        const max = maxSpeed;
        const vel = res.body.velocity;
        const speed = vel.length();

        if (speed > max) {
            vel.normalize().scale(max);
        } else if (speed < min) {
            if (speed === 0) {
                const angle = Math.random() * Math.PI * 2;
                vel.setTo(Math.cos(angle) * min, Math.sin(angle) * min);
            } else {
                vel.normalize().scale(min);
            }
        }
    },

    async getUserInfo(): Promise<{ ip: string; emoji: string }> {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            const ip = data.ip;
            const countryCode = data.country_code;
            const emoji = this.getEmojiByCountryCode(countryCode);
            return { ip, emoji };
        } catch (e) {
            return { ip: '127.0.0.1', emoji: '🌐' };
        }
    },

    getEmojiByCountryCode(countryCode: string): string {
        const cleanCode = countryCode.toUpperCase().trim();
        if (!/^[A-Z]{2}$/.test(cleanCode)) return '🌐';
        const codePoints: number[] = cleanCode
            .split('')
            .map((char: string) => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }
};
