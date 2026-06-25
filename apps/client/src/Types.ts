import Phaser from 'phaser';

/**
 * 자원 종류 정의
 */
export type ResourceType = 'rock' | 'wood';

/**
 * 특수 아이템 종류 정의
 */
export type SpecialItemType = 'whitehole' | 'boost';

/**
 * 수집 가능한 객체 인터페이스
 */
export interface Collectible extends Phaser.GameObjects.GameObject {
    x: number;
    y: number;
    active: boolean;
    body: Phaser.Physics.Arcade.Body;
    resourceType?: ResourceType;
    isHighDim?: boolean;
    itemType?: 'special';
    specialType?: SpecialItemType;
}

/**
 * 자원 객체 인터페이스
 */
export interface Resource extends Phaser.GameObjects.Text {
    resourceType: ResourceType;
    isHighDim: boolean;
    body: Phaser.Physics.Arcade.Body;
}

/**
 * 특수 아이콘 객체 인터페이스
 */
export interface SpecialItem extends Phaser.GameObjects.Text {
    itemType: 'special';
    specialType: SpecialItemType;
    body: Phaser.Physics.Arcade.Body;
}

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
    startedAt: number | null;
    completesAt: number | null;
}

/**
 * 스킬 트리 비용 구조
 */
export interface SkillCosts {
    rock?: number;
    wood?: number;
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
    | 'specialItemBooster';
