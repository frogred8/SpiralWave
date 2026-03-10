import { EffectProperty, SkillCosts } from './Types';

export interface SkillData {
    id: string;
    name: string;
    tree: number; // 0: Wood, 1: Rock, 2: Iron (column in UI)
    row: number; // row in UI
    costs: SkillCosts[]; // 레벨별 요구 자원 배열
    researchTimes: number[]; // 레벨별 연구 시간 (초)
    description: string;
    prerequisites?: { id: string, level: number }[]; // 다중 선행 조건 시스템
    effectProperty: EffectProperty; // 어떤 스탯을 변경할지
    effectValue: number; // 얼마나 변경할지
    maxLevel: number; // 최대 레벨
}