export type Language = 'en' | 'ko' | 'zh' | 'ja';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
    en: {
        // Resources
        'resource.wood': 'WOOD',
        'resource.rock': 'ROCK',
        
        // Stats Panel
        'stats.total': 'TOTAL',
        'stats.rate': '10s',
        'stats.time': 'TIME',
        'stats.radius': 'Radius',
        'stats.arms': 'Arms',
        'stats.speed': 'Speed',
        
        // Skill Tree UI
        'skill.level': 'Lv.',
        'skill.prerequisites': 'Prerequisites:',
        'skill.research_time': 'Research Time:',
        'skill.max_level': 'MAX LEVEL REACHED',
        'skill.queued': 'Queued',
        
        // Properties
        'prop.radius': 'Radius',
        'prop.force': 'Force',
        'prop.highDimProb': 'Big Resource Prob',
        'prop.maxArms': 'Max Arms',
        'prop.autoArm': 'Auto Arm',
        'prop.armSpeed': 'Arm Speed',
        'prop.maxResearchSlots': 'Max Research Slots',
        'prop.spawnRate': 'Spawn Rate',
        'prop.researchBonus': 'Research Reduction',
        'prop.moveSpeed': 'Move Speed',
        'prop.net': 'Resource Net',
        'prop.netAngle': 'Net Angle',
        
        // Utils / Formatting
        'ui.on': 'ON',
        'ui.off': 'OFF',
        'ui.enabled': 'Enabled',
        'ui.disabled': 'Disabled',
        'ui.activated': 'Activated',
        'ui.locked': 'Locked',
        'ui.reduction': 'reduction',
        
        // Skill Data (Keys matching SKILLTREE.json IDs or specific keys)
        'skill.q1.name': 'Radius Boost',
        'skill.q1.desc': 'Radius +5',
        'skill.q2.name': 'Force',
        'skill.q2.desc': 'Force +0.2',
        'skill.f2.name': 'Wider Net',
        'skill.f2.desc': 'Net Angle +15°',
        'skill.q3.name': 'Move Speed',
        'skill.q3.desc': 'Move Speed +0.5 (using Arrow Keys)',
        'skill.r1.name': 'Big Resource',
        'skill.r1.desc': 'Big Resource Prob +5%',
        'skill.arm_speed.name': 'Arm Speed',
        'skill.arm_speed.desc': 'Arm Speed +0.2x',
        'skill.r2.name': 'Research Speed',
        'skill.r2.desc': 'Research Reduction +1s',
        'skill.r3.name': 'Resource Boost',
        'skill.r3.desc': 'Resource Spawn Rate +0.2x',
        'skill.auto_arm.name': 'Auto Robotic Arm',
        'skill.auto_arm.desc': 'Auto Arm Activation',
        'skill.r4.name': 'Max Arms',
        'skill.r4.desc': 'Max Arms +1',
        'skill.arm_sync.name': 'Research Slot',
        'skill.arm_sync.desc': 'Research Slot +1',
        'skill.f1.name': 'Resource Net',
        'skill.f1.desc': 'Resource Net Activation'
    },
    ko: {
        // Resources
        'resource.wood': '나무',
        'resource.rock': '돌',
        
        // Stats Panel
        'stats.total': '총계',
        'stats.rate': '10초당',
        'stats.time': '시간',
        'stats.radius': '반지름',
        'stats.arms': '로봇팔',
        'stats.speed': '배속',
        
        // Skill Tree UI
        'skill.level': '레벨',
        'skill.prerequisites': '선행 조건:',
        'skill.research_time': '연구 시간:',
        'skill.max_level': '최대 레벨 도달',
        'skill.queued': '대기 중',
        
        // Properties
        'prop.radius': '반지름',
        'prop.force': '인력',
        'prop.highDimProb': '대형 자원 확률',
        'prop.maxArms': '최대 로봇팔',
        'prop.autoArm': '자동 로봇팔',
        'prop.armSpeed': '로봇팔 속도',
        'prop.maxResearchSlots': '연구 슬롯',
        'prop.spawnRate': '생성 속도',
        'prop.researchBonus': '연구 시간 단축',
        'prop.moveSpeed': '이동 속도',
        'prop.net': '자원 그물',
        'prop.netAngle': '그물 각도',
        
        // Utils / Formatting
        'ui.on': '켬',
        'ui.off': '끔',
        'ui.enabled': '활성화됨',
        'ui.disabled': '비활성화됨',
        'ui.activated': '개방됨',
        'ui.locked': '잠김',
        'ui.reduction': '단축',
        
        // Skill Data
        'skill.q1.name': '반지름 확장',
        'skill.q1.desc': '반지름 +5',
        'skill.q2.name': '인력 강화',
        'skill.q2.desc': '인력 +0.2',
        'skill.f2.name': '그물 확장',
        'skill.f2.desc': '그물 각도 +15°',
        'skill.q3.name': '이동 속도',
        'skill.q3.desc': '이동 속도 +0.5 (방향키 사용)',
        'skill.r1.name': '대형 자원',
        'skill.r1.desc': '대형 자원 확률 +5%',
        'skill.arm_speed.name': '로봇팔 속도',
        'skill.arm_speed.desc': '로봇팔 속도 +0.2x',
        'skill.r2.name': '연구 속도',
        'skill.r2.desc': '연구 시간 단축 +1초',
        'skill.r3.name': '자원 생성',
        'skill.r3.desc': '자원 생성 속도 +0.2x',
        'skill.auto_arm.name': '자동 로봇팔',
        'skill.auto_arm.desc': '자동 로봇팔 활성화',
        'skill.r4.name': '로봇팔 증설',
        'skill.r4.desc': '최대 로봇팔 +1',
        'skill.arm_sync.name': '연구 슬롯',
        'skill.arm_sync.desc': '연구 슬롯 +1',
        'skill.f1.name': '자원 그물',
        'skill.f1.desc': '자원 그물 활성화'
    },
    zh: {
        // Resources
        'resource.wood': '木头',
        'resource.rock': '石头',
        
        // Stats Panel
        'stats.total': '总计',
        'stats.rate': '10秒',
        'stats.time': '时间',
        'stats.radius': '半径',
        'stats.arms': '机械臂',
        'stats.speed': '倍速',
        
        // Skill Tree UI
        'skill.level': '等级',
        'skill.prerequisites': '前提条件:',
        'skill.research_time': '研究时间:',
        'skill.max_level': '已达最高等级',
        'skill.queued': '等待中',
        
        // Properties
        'prop.radius': '半径',
        'prop.force': '引力',
        'prop.highDimProb': '大资源概率',
        'prop.maxArms': '最大机械臂数',
        'prop.autoArm': '自动机械臂',
        'prop.armSpeed': '机械臂速度',
        'prop.maxResearchSlots': '研究位',
        'prop.spawnRate': '生成速度',
        'prop.researchBonus': '研究时间缩短',
        'prop.moveSpeed': '移动速度',
        'prop.net': '资源网',
        'prop.netAngle': '网角度',
        
        // Utils / Formatting
        'ui.on': '开',
        'ui.off': '关',
        'ui.enabled': '已启用',
        'ui.disabled': '已禁用',
        'ui.activated': '已激活',
        'ui.locked': '未解锁',
        'ui.reduction': '减少',
        
        // Skill Data
        'skill.q1.name': '半径提升',
        'skill.q1.desc': '半径 +5',
        'skill.q2.name': '引力强化',
        'skill.q2.desc': '引力 +0.2',
        'skill.f2.name': '宽网',
        'skill.f2.desc': '网角度 +15°',
        'skill.q3.name': '移动速度',
        'skill.q3.desc': '移动速度 +0.5 (使用方向键)',
        'skill.r1.name': '大资源',
        'skill.r1.desc': '大资源概率 +5%',
        'skill.arm_speed.name': '机械臂速度',
        'skill.arm_speed.desc': '机械臂速度 +0.2x',
        'skill.r2.name': '研究速度',
        'skill.r2.desc': '研究缩短 +1秒',
        'skill.r3.name': '资源提升',
        'skill.r3.desc': '资源生成速度 +0.2x',
        'skill.auto_arm.name': '自动机械臂',
        'skill.auto_arm.desc': '自动机械臂激活',
        'skill.r4.name': '机械臂增设',
        'skill.r4.desc': '最大机械臂数 +1',
        'skill.arm_sync.name': '研究位',
        'skill.arm_sync.desc': '研究位 +1',
        'skill.f1.name': '资源网',
        'skill.f1.desc': '资源网激活'
    },
    ja: {
        // Resources
        'resource.wood': '木材',
        'resource.rock': '石材',
        
        // Stats Panel
        'stats.total': '合計',
        'stats.rate': '10秒間',
        'stats.time': '時間',
        'stats.radius': '半径',
        'stats.arms': 'アーム',
        'stats.speed': '倍速',
        
        // Skill Tree UI
        'skill.level': 'Lv.',
        'skill.prerequisites': '前提条件:',
        'skill.research_time': '研究時間:',
        'skill.max_level': '最大レベル到達',
        'skill.queued': '待機中',
        
        // Properties
        'prop.radius': '半径',
        'prop.force': '引力',
        'prop.highDimProb': '大型資源確率',
        'prop.maxArms': '最大アーム数',
        'prop.autoArm': '自動アーム',
        'prop.armSpeed': 'アーム速度',
        'prop.maxResearchSlots': '研究スロット',
        'prop.spawnRate': '出現速度',
        'prop.researchBonus': '研究時間短縮',
        'prop.moveSpeed': '移動速度',
        'prop.net': '資源ネット',
        'prop.netAngle': 'ネット角度',
        
        // Utils / Formatting
        'ui.on': 'ON',
        'ui.off': 'OFF',
        'ui.enabled': '有効',
        'ui.disabled': '無効',
        'ui.activated': '開放済み',
        'ui.locked': 'ロック中',
        'ui.reduction': '短縮',
        
        // Skill Data
        'skill.q1.name': '半径拡張',
        'skill.q1.desc': '半径 +5',
        'skill.q2.name': '引力強化',
        'skill.q2.desc': '引力 +0.2',
        'skill.f2.name': 'ネット拡張',
        'skill.f2.desc': 'ネット角度 +15°',
        'skill.q3.name': '移動速度',
        'skill.q3.desc': '移動速度 +0.5 (方向キー使用)',
        'skill.r1.name': '大型資源',
        'skill.r1.desc': '大型資源確率 +5%',
        'skill.arm_speed.name': 'アーム速度',
        'skill.arm_speed.desc': 'アーム速度 +0.2x',
        'skill.r2.name': '研究速度',
        'skill.r2.desc': '研究時間短縮 +1秒',
        'skill.r3.name': '資源生成',
        'skill.r3.desc': '資源生成速度 +0.2x',
        'skill.auto_arm.name': '自動アーム',
        'skill.auto_arm.desc': '自動アーム活性化',
        'skill.r4.name': 'アーム増設',
        'skill.r4.desc': '最大アーム数 +1',
        'skill.arm_sync.name': '研究スロット',
        'skill.arm_sync.desc': '研究スロット +1',
        'skill.f1.name': '資源ネット',
        'skill.f1.desc': '資源ネット活性化'
    }
};

export class I18n {
    private static currentLanguage: Language = 'ko'; // 기본값 한국어

    public static setLanguage(lang: Language) {
        this.currentLanguage = lang;
    }

    public static getLanguage(): Language {
        return this.currentLanguage;
    }

    public static t(key: string): string {
        return TRANSLATIONS[this.currentLanguage][key] || key;
    }
}
