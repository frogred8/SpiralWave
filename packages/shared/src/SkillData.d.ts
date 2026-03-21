import { EffectProperty, SkillCosts } from './Types';
export interface SkillData {
    id: string;
    name?: string;
    tree: number;
    row: number;
    costs: SkillCosts[];
    researchTimes: number[];
    description?: string;
    prerequisites?: {
        id: string;
        level: number;
    }[];
    effectProperty: EffectProperty;
    effectValue: number;
    maxLevel: number;
}
