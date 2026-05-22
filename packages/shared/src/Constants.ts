export const SPAWN_BOUNDARY = {
    WIDTH: 1200,
    HEIGHT: 800,
    Y_MIN: 150,
    Y_MAX: 650
};

export const INITIAL_STATS = {
    ROCK: 500,
    WOOD: 500,
    FORCE: 0.5,
    RADIUS: 200,
    HIGH_DIM_PROB: 0.0,
    MAX_RESOURCES: 300,
    MAX_ARMS: 1,
    ARM_SPEED_FACTOR: 1.0,
    SPAWN_RATE_FACTOR: 1.0,
    RESEARCH_BONUS: 0,
    MOVE_SPEED: 0,
    MAX_RESEARCH_SLOTS: 1,
    TIME_LIMIT: 300,
    NET_ANGLE: 45,
    SMALL_BLACK_HOLE_RADIUS: 150,
    NET_DISTANCE: 500,
    SPECIAL_ITEM_INTERVAL: 15000,
    MAX_FEVER_GAUGE: 100
};

export const SKILL_TREE_CONFIG = {
    TOTAL_SKILLS: 15,
    TREES: 3,
    ROWS: 5
};

export const DURATIONS = {
    WHITE_HOLE: 3000,
    WHITE_HOLE_SHRINK: 500,
    WHITE_HOLE_SPAWN: 8000,
    SMALL_BLACK_HOLE_ACTIVE: 3000,
    SMALL_BLACK_HOLE_SHRINK: 2000,
    SMALL_BLACK_HOLE_SPAWN: 9000,
    SMALL_BLACK_HOLE_DELAY_MIN: 2000,
    SMALL_BLACK_HOLE_DELAY_MAX: 4000,
    RADIUS_BOOST: 5000,
    RADIUS_BOOST_SHRINK: 2000,
    SPECIAL_ITEM_SPAWN: 15000,
    METEOR_INTERVAL: 15000,
    BOMB_INTERVAL: 12000,
    NET_COOLDOWN: 5000,
    NET_DISTANCE: 600,
    NET_ANIMATION: 600,
    NET_PULL: 600,
    ARM_AUTO_FIRE_COOLDOWN: 1000,
    ARM_AUTO_FIRE_SEARCH_RADIUS: 600,
    ARM_RETRACT_BASE: 800,
    ARM_EXTEND_BASE: 600,
    FEVER_MODE: 10000
};

export const RESOURCE_CONFIG = {
    SPAWN_INTERVAL_BASE: 1000,
    TYPES: ['rock', 'wood'] as const,
    ICONS: {
        rock: '🪨',
        wood: '🪵',
        whitehole: '🌀',
        boost: '⚡',
        default: '✨'
    },
    COLORS: {
        rock: 0xaaaaaa,
        wood: 0x8b4513,
        special: 0x00ffff,
        default: 0xffffff
    },
    COLLECTION_RADIUS: {
        NORMAL: 30,
        HIGH_DIM: 45
    },
    HIGH_DIM_MULTIPLIER: 5,
    BOMB: {
        PENALTY: {
            rock: 50,
            wood: 50
        },
        MIN_DIST_OFFSET: 180,
        MAX_DIST: 700
    },
    WHITE_HOLE: {
        MIN_DIST_OFFSET: 100,
        MAX_DIST: 500
    },
    SMALL_BLACK_HOLE: {
        MIN_DIST_OFFSET: 150,
        MAX_DIST_BASE: 800,
        MIN_GAP: 300
    }
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
        SPACING_X: 140,
        SPACING_Y: 100,
        BG_COLOR: 0x222222,
        STROKE_COLOR: 0x555555,
        HOVER_STROKE_COLOR: 0x00ffff,
        DISABLED_BG_COLOR: 0x111111,
        DISABLED_TEXT_COLOR: '#555555'
    },
    TOOLTIP: {
        WIDTH: 200,
        BG_COLOR: 0x111111,
        ALPHA: 0.9,
        STROKE_COLOR: 0x444444
    },
    SKILL_TREE: {
        START_X: 100,
        START_Y: 130
    }
};

export const LIMITS = {
    END_NAME_LENGTH: 10,
    END_MSG_LENGTH: 200
};
