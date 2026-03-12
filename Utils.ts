import Phaser from 'phaser';
import { I18n } from './I18n';

/**
 * 게임 전반에서 사용되는 유틸리티 함수들
 */
export const Utils = {
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
            case 'researchBonus': return `${value}s ${I18n.t('ui.reduction')}`;
            case 'moveSpeed': return `${value.toFixed(2)}`;
            case 'netAngle': return `${value}°`;
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
            case 'researchBonus': return `${bonus}s ${I18n.t('ui.reduction')}`;
            case 'netAngle': return `${sign}${bonus}°`;
            default: return `${sign}${bonus % 1 === 0 ? bonus : bonus.toFixed(2)}`;
        }
    }
};
