export declare const SPAWN_BOUNDARY: {
    WIDTH: number;
    HEIGHT: number;
    Y_MIN: number;
    Y_MAX: number;
};
export declare const INITIAL_STATS: {
    FORCE: number;
    RADIUS: number;
    HIGH_DIM_PROB: number;
    MAX_RESOURCES: number;
    MAX_ARMS: number;
    ARM_SPEED_FACTOR: number;
    SPAWN_RATE_FACTOR: number;
    RESEARCH_BONUS: number;
    MOVE_SPEED: number;
    MAX_RESEARCH_SLOTS: number;
    TIME_LIMIT: number;
    NET_ANGLE: number;
    SMALL_BLACK_HOLE_RADIUS: number;
    NET_DISTANCE: number;
    SPECIAL_ITEM_INTERVAL: number;
};
export declare const SKILL_TREE_CONFIG: {
    TOTAL_SKILLS: number;
    TREES: number;
    ROWS: number;
};
export declare const DURATIONS: {
    WHITE_HOLE: number;
    WHITE_HOLE_SHRINK: number;
    WHITE_HOLE_SPAWN: number;
    SMALL_BLACK_HOLE_ACTIVE: number;
    SMALL_BLACK_HOLE_SHRINK: number;
    SMALL_BLACK_HOLE_SPAWN: number;
    SMALL_BLACK_HOLE_DELAY_MIN: number;
    SMALL_BLACK_HOLE_DELAY_MAX: number;
    RADIUS_BOOST: number;
    RADIUS_BOOST_SHRINK: number;
    SPECIAL_ITEM_SPAWN: number;
    METEOR_INTERVAL: number;
    NET_COOLDOWN: number;
    NET_DISTANCE: number;
    NET_ANIMATION: number;
    NET_PULL: number;
    ARM_AUTO_FIRE_COOLDOWN: number;
    ARM_RETRACT_BASE: number;
    ARM_EXTEND_BASE: number;
};
export declare const RESOURCE_CONFIG: {
    SPAWN_INTERVAL_BASE: number;
    TYPES: readonly ["rock", "wood"];
    ICONS: {
        rock: string;
        wood: string;
        whitehole: string;
        boost: string;
        default: string;
    };
    COLORS: {
        rock: number;
        wood: number;
        special: number;
        default: number;
    };
    COLLECTION_RADIUS: {
        NORMAL: number;
        HIGH_DIM: number;
    };
    HIGH_DIM_MULTIPLIER: number;
    WHITE_HOLE: {
        MIN_DIST_OFFSET: number;
        MAX_DIST: number;
    };
    SMALL_BLACK_HOLE: {
        MIN_DIST_OFFSET: number;
        MAX_DIST_BASE: number;
        MIN_GAP: number;
    };
};
export declare const PHYSICS_CONFIG: {
    MAX_SPEED: number;
    MIN_SPEED_NORMAL: number;
    MIN_SPEED_NEAR_CENTER: number;
    ACCEL_BASE: number;
    PUSH_FORCE: number;
    OVERLAP_BIAS: number;
    BOUNCE: number;
    DRAG_BASE: number;
};
export declare const UI_CONFIG: {
    BUTTON: {
        WIDTH: number;
        HEIGHT: number;
        SPACING_X: number;
        SPACING_Y: number;
        BG_COLOR: number;
        STROKE_COLOR: number;
        HOVER_STROKE_COLOR: number;
        DISABLED_BG_COLOR: number;
        DISABLED_TEXT_COLOR: string;
    };
    TOOLTIP: {
        WIDTH: number;
        BG_COLOR: number;
        ALPHA: number;
        STROKE_COLOR: number;
    };
    SKILL_TREE: {
        START_X: number;
        START_Y: number;
    };
};
