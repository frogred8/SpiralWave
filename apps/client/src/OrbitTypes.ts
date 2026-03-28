import Phaser from 'phaser';
import { Collectible } from '@repo/shared';

export type OrbitCollectionState = 'floating' | 'attracted' | 'collected';

export interface Resource extends Collectible {
    orbitCollectionState?: OrbitCollectionState;
    isBeingPulled?: boolean;
}

export interface Satellite extends Phaser.GameObjects.Container {
    orbitRadius: number;
    angle: number;
    angularVelocity: number;
    gravityRadius: number;
    collectionRadius: number;
}

export interface OrbitState {
    center: Phaser.Math.Vector2;
    satellites: Satellite[];
    elapsedMs: number;
}
