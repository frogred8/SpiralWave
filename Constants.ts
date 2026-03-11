export const INITIAL_STATS = {
    FORCE: 0.5,
    RADIUS: 200,
    HIGH_DIM_PROB: 0.0,
    MAX_RESOURCES: 300,
    MAX_ARMS: 1,
    ARM_SPEED_FACTOR: 1.0,
    SPAWN_RATE_FACTOR: 1.0,
    RESEARCH_BONUS: 0,
    MOVE_SPEED: 0,
    MAX_RESEARCH_SLOTS: 1
};

export const DURATIONS = {
    WHITE_HOLE: 3000,
    WHITE_HOLE_SHRINK: 500,
    RADIUS_BOOST: 5000,
    RADIUS_BOOST_SHRINK: 2000,
    SPECIAL_ITEM_SPAWN: 15000,
    NET_COOLDOWN: 5000,
    NET_DISTANCE: 600,
    NET_ANIMATION: 600,
    NET_PULL: 600,
    ARM_AUTO_FIRE_COOLDOWN: 8000,
    ARM_RETRACT_BASE: 800,
    ARM_EXTEND_BASE: 600
};

export const RESOURCE_CONFIG = {
    SPAWN_INTERVAL_BASE: 1000,
    TYPES: ['rock', 'wood', 'iron'] as const,
    ICONS: {
        rock: '🪨',
        wood: '🪵',
        iron: '🪙',
        whitehole: '🌀',
        boost: '⚡',
        default: '✨'
    },
    COLORS: {
        rock: 0xaaaaaa,
        wood: 0x8b4513,
        iron: 0x778899,
        special: 0x00ffff,
        default: 0xffffff
    },
    COLLECTION_RADIUS: {
        NORMAL: 30,
        HIGH_DIM: 45
    },
    HIGH_DIM_MULTIPLIER: 5
};

export const PHYSICS_CONFIG = {
    MAX_SPEED: 240,
    MIN_SPEED_NORMAL: 30,
    MIN_SPEED_NEAR_CENTER: 10,
    ACCEL_BASE: 90,
    PUSH_FORCE: 150,
    OVERLAP_BIAS: 100,
    BOUNCE: 0.8,
    DRAG_BASE: 50
};

export const UI_CONFIG = {
    BUTTON: {
        WIDTH: 100,
        HEIGHT: 60,
        SPACING_X: 120,
        SPACING_Y: 100,
        BG_COLOR: 0x222222,
        STROKE_COLOR: 0x444444,
        HOVER_STROKE_COLOR: 0xffffff,
        DISABLED_BG_COLOR: 0x111111,
        DISABLED_TEXT_COLOR: 0x666666
    },
    TOOLTIP: {
        WIDTH: 200,
        BG_COLOR: 0x111111,
        ALPHA: 0.9,
        STROKE_COLOR: 0x444444
    }
};
