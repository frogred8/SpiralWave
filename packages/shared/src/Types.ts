/**
 * 자원 종류 정의
 */
export type ResourceType = 'rock' | 'wood';

/**
 * 특수 아이템 종류 정의
 */
export type SpecialItemType = 'whitehole' | 'boost';

/**
 * 로봇팔 상태 정의
 */
export type ArmState = 'idle' | 'extending' | 'retracting';

/**
 * 연구 정보 인터페이스
 */
export interface ActiveResearch {
    skillId: string;
    remainingTime: number;
    totalTime: number;
}

/**
 * 스킬 트리 비용 구조
 */
export interface SkillCosts {
    rock?: number;
    wood?: number;
}

/**
 * 스킬 분류 및 전투형 액티브 스킬 메타데이터
 */
export type SkillKind = 'passive' | 'active';

export type ActiveSkillEffect = 'areaHarvest' | 'focusedHarvest';

export interface ActiveSkillStats {
    damage: number;
    manaCost: number;
    cooldownMs: number;
    range: number;
    effect: ActiveSkillEffect;
}

/**
 * 스탯 속성 리스트
 */
export type EffectProperty = 
    | 'radius' 
    | 'force' 
    | 'highDimProb' 
    | 'maxArms' 
    | 'autoArm' 
    | 'armSpeed' 
    | 'maxResearchSlots' 
    | 'spawnRate' 
    | 'researchBonus' 
    | 'moveSpeed' 
    | 'net'
    | 'netAngle'
    | 'satelliteCount'
    | 'smallBlackHole'
    | 'smallBlackHoleRange'
    | 'netLength'
    | 'specialItemBooster'
    | 'maxMana'
    | 'manaRegen'
    | 'activeSkillDamage'
    | 'activeSkillRange'
    | 'activeSkillCooldownReduction'
    | 'activeCombatSkill';
