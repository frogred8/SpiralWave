export const SKILL_TREE_DATA = [
    { id: 'w1', name: 'Gravity Well', tree: 0, row: 0, costType: 'wood', baseCost: 10, description: 'Radius +50', effectProperty: 'radius', effectValue: 50, maxLevel: 20 },
    { id: 'w2', name: 'Event Horizon', tree: 0, row: 1, costType: 'wood', baseCost: 20, description: 'Radius +100', effectProperty: 'radius', effectValue: 100, prereq: 'w1', maxLevel: 20 },
    { id: 'r1', name: 'Dense Core', tree: 1, row: 0, costType: 'rock', baseCost: 10, description: 'Force +0.2', effectProperty: 'force', effectValue: 0.2, maxLevel: 20 },
    { id: 'r2', name: 'Singularity', tree: 1, row: 1, costType: 'rock', baseCost: 25, description: 'Force +0.5', effectProperty: 'force', effectValue: 0.5, prereq: 'r1', maxLevel: 20 },
    { id: 'f1', name: 'Schooling', tree: 2, row: 0, costType: 'fish', baseCost: 10, description: 'Max Objects +50', effectProperty: 'maxResources', effectValue: 50, maxLevel: 20 },
    { id: 'f2', name: 'Abyssal Maw', tree: 2, row: 1, costType: 'fish', baseCost: 30, description: 'Max Objects +150', effectProperty: 'maxResources', effectValue: 150, prereq: 'f1', maxLevel: 20 }
];
