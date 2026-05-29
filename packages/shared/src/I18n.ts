export type Language = 'en' | 'ko' | 'zh' | 'ja';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
    en: {
        // Resources
        'resource.wood': 'WOOD',
        'resource.rock': 'ROCK',
        
        // Stats Panel
        'stats.total': 'TOTAL',
        'stats.rate': 'per 10s',
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
        'skill.waiting': '(Prereq)',

        // Properties

        'prop.radius': 'Radius',
        'prop.force': 'Force',
        'prop.highDimProb': 'Big Resource Prob',
        'prop.maxArms': 'Max Arms',
        'prop.autoArm': 'Auto Arm',
        'prop.armSpeed': 'Arm Speed',
        'prop.maxResearchSlots': 'Max Research Slots',
        'prop.spawnRate': 'Spawn Rate',
        'prop.researchBonus': 'Research time reduction when using robotic arm',
        'prop.satelliteCount': 'Satellites',
        'prop.moveSpeed': 'Move Speed',
        'prop.net': 'Resource Net',
        'prop.netAngle': 'Net Angle',
        'prop.smallBlackHole': 'Small Black Holes',
        'prop.smallBlackHoleRange': 'Small Black Hole Range',
        'prop.netLength': 'Net Length',
        'prop.specialItemBooster': 'Special Item Interval',
        
        // Utils / Formatting
        'ui.on': 'ON',
        'ui.off': 'OFF',
        'ui.enabled': 'Enabled',
        'ui.disabled': 'Disabled',
        'ui.activated': 'Unlocked',
        'ui.locked': 'Locked',
        'ui.choose_starting_skill': 'Choose a Starting Skill',
        'ui.game_over': 'TIME\'S UP!',
        'ui.total_resources': 'Total Resources Collected',
        'ui.restart': 'RESTART GAME',
        'ui.reroll': 'REROLL',
        'ui.click_to_select': 'CLICK TO SELECT',
        'ui.game_tips_title': 'Game Tips',
        'ui.game_tips_body': '- Fever Mode activates when you collect resources and fill the gauge completely!\n- Find your own optimal combination in a skill tree that changes every run.\n- Suggestions from Top 10 users will be applied in the next update.',
        'ui.submit_score': 'Submit Your Score',
        'ui.name': 'Name (Max 10 chars)',
        'ui.message': 'Suggestions for the next update',
        'ui.message_tooltip': 'Suggestions from Top 10 players will be applied in the next update. However, features that seriously harm game balance or are excessively large will be restricted.',
        'ui.submit': 'SUBMIT',
        'ui.skip': 'SKIP',
        'ui.close': 'CLOSE',
        'ui.leaderboard': 'Leaderboard',
        'ui.rank_score': 'Score',
        'ui.rank_player': 'Player',
        'ui.rank_message': 'Message',
        'ui.no_rankings': 'No rankings yet.',
        'ui.bonus_time': 'BONUS TIME!',
        'ui.preview_builds': 'Server List',
        'ui.release_notes': 'Release Notes',
        'ui.stable_release': 'Stable Release',
        'ui.blog': 'Blog',
        'ui.github': 'GitHub',
        'ui.open_build': 'CONNECT',
        'ui.current_server': 'CURRENT CONNECTION',
        'ui.current_version': 'Version',
        'ui.no_release_note': 'No release note.',
        'ui.paused': 'Paused',
        'ui.resume': 'RESUME',
        
        // Units
        'unit.second': 's',
        
        // Skill Data (Keys matching SKILLTREE.json IDs or specific keys)
        'skill.q1.name': 'Radius Boost',
        'skill.q1.desc': 'Radius +20',
        'skill.small_black_hole.name': 'Small Black Hole',
        'skill.small_black_hole.desc': 'Spawn +1 small black hole that absorbs resources (3s active, 2s shrink)',
        'skill.f2.name': 'Wider Net',
        'skill.f2.desc': 'Net Angle +15°',
        'skill.q3.name': 'Move Speed',
        'skill.q3.desc': 'Move Speed +0.5 (using Arrow Keys)',
        'skill.r1.name': 'Big Resource',
        'skill.r1.desc': 'Big Resource Prob +5%',
        'skill.arm_speed.name': 'Arm Speed',
        'skill.arm_speed.desc': 'Arm Speed +0.4x',
        'skill.r2.name': 'Add Satellite',
        'skill.r2.desc': 'Satellite Count +1',
        'skill.r3.name': 'Resource Boost',
        'skill.r3.desc': 'Resource Spawn Rate +0.3x',
        'skill.auto_arm.name': 'Auto Robotic Arm',
        'skill.auto_arm.desc': 'Auto Arm Activation',
        'skill.r4.name': 'Max Arms',
        'skill.r4.desc': 'Max Arms +1',
        'skill.arm_sync.name': 'Research Slot',
        'skill.arm_sync.desc': 'Research Slot +1',
        'skill.f1.name': 'Resource Net',
        'skill.f1.desc': 'Resource Net Activation',
        'skill.small_black_hole_range.name': 'SBH Range',
        'skill.small_black_hole_range.desc': 'Small Black Hole Range +10',
        'skill.net_length.name': 'Net Length',
        'skill.net_length.desc': 'Net Length +100',
        'skill.special_item_booster.name': 'Special Item Booster',
        'skill.special_item_booster.desc': 'Special Item Spawn Interval -1s'
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
        'skill.waiting': '(선행)',

        // Properties


        'prop.radius': '반지름',
        'prop.force': '인력',
        'prop.highDimProb': '대형 자원 확률',
        'prop.maxArms': '최대 로봇팔',
        'prop.autoArm': '자동 로봇팔',
        'prop.armSpeed': '로봇팔 속도',
        'prop.maxResearchSlots': '연구 슬롯',
        'prop.spawnRate': '생성 속도',
        'prop.researchBonus': '로봇팔 사용 시 연구 시간 단축',
        'prop.satelliteCount': '위성 개수',
        'prop.moveSpeed': '이동 속도',
        'prop.net': '자원 그물',
        'prop.netAngle': '그물 각도',
        'prop.smallBlackHole': '작은 블랙홀 개수',
        'prop.smallBlackHoleRange': '작은 블랙홀 범위',
        'prop.netLength': '그물 길이',
        'prop.specialItemBooster': '특수 아이템 주기',
        
        // Utils / Formatting
        'ui.on': '켬',
        'ui.off': '끔',
        'ui.enabled': '활성화됨',
        'ui.disabled': '비활성화됨',
        'ui.activated': '개방됨',
        'ui.locked': '잠김',
        'ui.choose_starting_skill': '시작 스킬을 선택하세요',
        'ui.game_over': '시간 종료!',
        'ui.total_resources': '총 수집 자원',
        'ui.restart': '다시 시작',
        'ui.reroll': '다시 선택',
        'ui.click_to_select': '클릭하여 선택',
        'ui.game_tips_title': '게임 팁',
        'ui.game_tips_body': '- 자원을 획득해서 게이지를 끝까지 충전하면 발동되는 피버 모드!\n- 매번 달라지는 스킬 트리로 당신만의 최적 조합을 찾아내세요.\n- Top10 유저의 제안 사항은 다음 업데이트에 적용됩니다.',
        'ui.submit_score': '점수 제출',
        'ui.name': '이름 (10자 이하)',
        'ui.message': '다음 업데이트 제안',
        'ui.message_tooltip': 'Top10 유저의 제안 사항은 다음 업데이트에 적용됩니다. 단, 게임 내 밸런스를 심각하게 해치거나 지나치게 큰 기능은 제한될 수 있습니다.',
        'ui.submit': '제출',
        'ui.skip': '건너뛰기',
        'ui.close': '닫기',
        'ui.leaderboard': '리더보드',
        'ui.rank_score': '점수',
        'ui.rank_player': '플레이어',
        'ui.rank_message': '메시지',
        'ui.no_rankings': '순위가 없습니다.',
        'ui.bonus_time': '보너스 시간!',
        'ui.preview_builds': '서버 목록',
        'ui.release_notes': '릴리즈 노트',
        'ui.stable_release': '안정 버전',
        'ui.blog': 'Blog',
        'ui.github': 'GitHub',
        'ui.open_build': '접속',
        'ui.current_server': '현재 접속',
        'ui.current_version': '버전',
        'ui.no_release_note': '릴리즈 노트가 없습니다.',
        'ui.paused': '일시 정지',
        'ui.resume': '계속하기',
        
        // Units
        'unit.second': '초',
        
        // Skill Data
        'skill.q1.name': '반지름 확장',
        'skill.q1.desc': '반지름 +20',
        'skill.small_black_hole.name': '작은 블랙홀',
        'skill.small_black_hole.desc': '자원을 흡수하는 작은 블랙홀 +1개 생성 (3초 유지, 2초간 축소)',
        'skill.f2.name': '그물 확장',
        'skill.f2.desc': '그물 각도 +15°',
        'skill.q3.name': '이동 속도',
        'skill.q3.desc': '이동 속도 +0.5 (방향키 사용)',
        'skill.r1.name': '대형 자원',
        'skill.r1.desc': '대형 자원 확률 +5%',
        'skill.arm_speed.name': '로봇팔 속도',
        'skill.arm_speed.desc': '로봇팔 속도 +0.4x',
        'skill.r2.name': '위성 추가',
        'skill.r2.desc': '위성 개수 +1',
        'skill.r3.name': '자원 생성',
        'skill.r3.desc': '자원 생성 속도 +0.3x',
        'skill.auto_arm.name': '자동 로봇팔',
        'skill.auto_arm.desc': '자동 로봇팔 활성화',
        'skill.r4.name': '로봇팔 증설',
        'skill.r4.desc': '최대 로봇팔 +1',
        'skill.arm_sync.name': '연구 슬롯',
        'skill.arm_sync.desc': '연구 슬롯 +1',
        'skill.f1.name': '자원 그물',
        'skill.f1.desc': '자원 그물 활성화',
        'skill.small_black_hole_range.name': '작은 블랙홀 범위',
        'skill.small_black_hole_range.desc': '작은 블랙홀 범위 +10',
        'skill.net_length.name': '그물 길이',
        'skill.net_length.desc': '그물 길이 +100',
        'skill.special_item_booster.name': '특수 아이템 부스터',
        'skill.special_item_booster.desc': '특수 아이템 생성 간격 -1초'
    },
    zh: {
        // Resources
        'resource.wood': '木头',
        'resource.rock': '石头',
        
        // Stats Panel
        'stats.total': '总计',
        'stats.rate': '每10秒',
        'stats.time': '时间',
        'stats.radius': '半径',
        'stats.arms': '机械臂',
        'stats.speed': '倍速',
        
        // Skill Tree UI
        'skill.level': '等级',
        'skill.prerequisites': '前提条件:',
        'skill.research_time': '研究时间:',
        'skill.max_level': '已达最高等级',
        'skill.queued': '等候',
        'skill.waiting': '(前提)',

        // Properties

        'prop.radius': '半径',
        'prop.force': '引力',
        'prop.highDimProb': '大资源概率',
        'prop.maxArms': '最大机械臂数',
        'prop.autoArm': '自动机械臂',
        'prop.armSpeed': '机械臂速度',
        'prop.maxResearchSlots': '研究位',
        'prop.spawnRate': '生成速度',
        'prop.researchBonus': '使用机械臂时缩短研究时间',
        'prop.satelliteCount': '卫星数量',
        'prop.moveSpeed': '移动速度',
        'prop.net': '资源网',
        'prop.netAngle': '网角度',
        'prop.smallBlackHole': '小黑洞数量',
        'prop.smallBlackHoleRange': '小黑洞范围',
        'prop.netLength': '网长度',
        'prop.specialItemBooster': '特殊物品间隔',
        
        // Utils / Formatting
        'ui.on': '开',
        'ui.off': '关',
        'ui.enabled': '已启用',
        'ui.disabled': '已禁用',
        'ui.activated': '已解锁',
        'ui.locked': '已锁定',
        'ui.choose_starting_skill': '选择初始技能',
        'ui.game_over': '时间到!',
        'ui.total_resources': '总共收集的资源',
        'ui.restart': '重新开始',
        'ui.reroll': '重新选择',
        'ui.click_to_select': '点击选择',
        'ui.game_tips_title': '游戏提示',
        'ui.game_tips_body': '- 收集资源并将能量槽充满即可发动狂热模式！\n- 在每次都会变化的技能树中，找出属于你的最佳组合。\n- Top10 用户的建议将在下次更新中应用。',
        'ui.submit_score': '提交分数',
        'ui.name': '姓名 (10个字符以内)',
        'ui.message': '对下次更新的建议',
        'ui.message_tooltip': '前 10 名玩家的建议将在下次更新中应用。但是，严重破坏游戏平衡或功能过于庞大的建议将受到限制。',
        'ui.submit': '提交',
        'ui.skip': '跳过',
        'ui.close': '关闭',
        'ui.leaderboard': '排行榜',
        'ui.rank_score': '分数',
        'ui.rank_player': '玩家',
        'ui.rank_message': '消息',
        'ui.no_rankings': '暂无排名。',
        'ui.bonus_time': '奖励时间！',
        'ui.preview_builds': '服务器列表',
        'ui.release_notes': '发布说明',
        'ui.stable_release': '稳定版本',
        'ui.blog': '博客',
        'ui.github': 'GitHub',
        'ui.open_build': '连接',
        'ui.current_server': '当前连接',
        'ui.current_version': '版本',
        'ui.no_release_note': '暂无发布说明。',
        'ui.paused': '已暂停',
        'ui.resume': '继续',
        
        // Units
        'unit.second': '秒',
        
        // Skill Data
        'skill.q1.name': '半径提升',
        'skill.q1.desc': '半径 +20',
        'skill.small_black_hole.name': '小黑洞',
        'skill.small_black_hole.desc': '生成 +1 个吸收资源的小黑洞（3秒活跃，2秒缩小）',
        'skill.f2.name': '宽网',
        'skill.f2.desc': '网角度 +15°',
        'skill.q3.name': '移动速度',
        'skill.q3.desc': '移动速度 +0.5 (使用方向键)',
        'skill.r1.name': '大资源',
        'skill.r1.desc': '大资源概率 +5%',
        'skill.arm_speed.name': '机械臂速度',
        'skill.arm_speed.desc': '机械臂速度 +0.4x',
        'skill.r2.name': '添加卫星',
        'skill.r2.desc': '卫星数量 +1',
        'skill.r3.name': '资源提升',
        'skill.r3.desc': '资源生成速度 +0.3x',
        'skill.auto_arm.name': '自动机械臂',
        'skill.auto_arm.desc': '自动机械臂激活',
        'skill.r4.name': '机械臂增设',
        'skill.r4.desc': '最大机械臂数 +1',
        'skill.arm_sync.name': '研究位',
        'skill.arm_sync.desc': '研究位 +1',
        'skill.f1.name': '资源网',
        'skill.f1.desc': '资源网激活',
        'skill.small_black_hole_range.name': '小黑洞范围',
        'skill.small_black_hole_range.desc': '小黑洞范围 +10',
        'skill.net_length.name': '网长度',
        'skill.net_length.desc': '网长度 +100',
        'skill.special_item_booster.name': '特殊物品助推器',
        'skill.special_item_booster.desc': '特殊物品生成间隔 -1秒'
    },
    ja: {
        // Resources
        'resource.wood': '木材',
        'resource.rock': '石材',
        
        // Stats Panel
        'stats.total': '合計',
        'stats.rate': '10秒あたり',
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
        'skill.waiting': '(前提)',

        // Properties

        'prop.radius': '半径',
        'prop.force': '引力',
        'prop.highDimProb': '大型資源確率',
        'prop.maxArms': '最大アーム数',
        'prop.autoArm': '自動アーム',
        'prop.armSpeed': 'アーム速度',
        'prop.maxResearchSlots': '研究スロット',
        'prop.spawnRate': '出現速度',
        'prop.researchBonus': 'アーム使用時の研究時間短縮',
        'prop.satelliteCount': '衛星数',
        'prop.moveSpeed': '移動速度',
        'prop.net': '資源ネット',
        'prop.netAngle': 'ネット角度',
        'prop.smallBlackHole': '小型ブラックホール数',
        'prop.smallBlackHoleRange': '小型ブラックホール範囲',
        'prop.netLength': 'ネットの長さ',
        'prop.specialItemBooster': '特殊アイテム間隔',
        
        // Utils / Formatting
        'ui.on': 'ON',
        'ui.off': 'OFF',
        'ui.enabled': '有効',
        'ui.disabled': '無効',
        'ui.activated': '開放済み',
        'ui.locked': 'ロック中',
        'ui.choose_starting_skill': '開始スキルを選択してください',
        'ui.game_over': 'タイムアップ！',
        'ui.total_resources': '合計獲得資源',
        'ui.restart': '最初からやり直す',
        'ui.reroll': '再選択',
        'ui.click_to_select': 'クリックして選択',
        'ui.game_tips_title': 'ゲームのコツ',
        'ui.game_tips_body': '- 資源を集めてゲージを最後まで満たすと、フィーバーモードが発動します！\n- 毎回変化するスキルツリーで、あなただけの最適な組み合わせを見つけましょう。\n- Top10ユーザーの提案は次のアップデートで適用されます。',
        'ui.submit_score': 'スコア送信',
        'ui.name': '名前 (10文字以内)',
        'ui.message': '次のアップデートへの要望',
        'ui.message_tooltip': 'Top10ユーザーの提案は次のアップデートで適用されます。ただし、ゲーム内のバランスを深刻に損なうものや、過大すぎる機能は制限されます。',
        'ui.submit': '送信',
        'ui.skip': 'スキップ',
        'ui.close': '閉じる',
        'ui.leaderboard': 'リーダーボード',
        'ui.rank_score': 'スコア',
        'ui.rank_player': 'プレイヤー',
        'ui.rank_message': 'メッセージ',
        'ui.no_rankings': 'ランキングがまだありません。',
        'ui.bonus_time': 'ボーナスタイム！',
        'ui.preview_builds': 'サーバー一覧',
        'ui.release_notes': 'リリースノート',
        'ui.stable_release': '安定版',
        'ui.blog': 'ブログ',
        'ui.github': 'GitHub',
        'ui.open_build': '接続',
        'ui.current_server': '現在の接続',
        'ui.current_version': 'バージョン',
        'ui.no_release_note': 'リリースノートはありません。',
        'ui.paused': '一時停止',
        'ui.resume': '再開',

        // Units
        'unit.second': '秒',
        
        // Skill Data
        'skill.q1.name': '半径拡張',
        'skill.q1.desc': '半径 +20',
        'skill.small_black_hole.name': '小型ブラックホール',
        'skill.small_black_hole.desc': '資源を吸収する小型ブラックホール +1 個を生成 (3秒維持、2秒かけて縮小)',
        'skill.f2.name': 'ネット拡張',
        'skill.f2.desc': 'ネット角度 +15°',
        'skill.q3.name': '移動速度',
        'skill.q3.desc': '移動速度 +0.5 (方向キー使用)',
        'skill.r1.name': '大型資源',
        'skill.r1.desc': '大型資源確率 +5%',
        'skill.arm_speed.name': 'アーム速度',
        'skill.arm_speed.desc': 'アーム速度 +0.4x',
        'skill.r2.name': '衛星追加',
        'skill.r2.desc': '衛星数 +1',
        'skill.r3.name': '資源生成',
        'skill.r3.desc': '資源生成速度 +0.3x',
        'skill.auto_arm.name': '自動アーム',
        'skill.auto_arm.desc': '自動アーム活性化',
        'skill.r4.name': 'アーム増設',
        'skill.r4.desc': '最大アーム数 +1',
        'skill.arm_sync.name': '研究スロット',
        'skill.arm_sync.desc': '研究スロット +1',
        'skill.f1.name': '資源ネット',
        'skill.f1.desc': '資源ネット活性化',
        'skill.small_black_hole_range.name': '小型ブラックホール範囲',
        'skill.small_black_hole_range.desc': '小型ブラックホール範囲 +10',
        'skill.net_length.name': 'ネットの長さ',
        'skill.net_length.desc': 'ネットの長さ +100',
        'skill.special_item_booster.name': '特殊アイテムブースター',
        'skill.special_item_booster.desc': '特殊アイテム出現間隔 -1秒'
    }
};

export class I18n {
    private static currentLanguage: Language = I18n.getInitialLanguage();

    private static getInitialLanguage(): Language {
        if (typeof window === 'undefined') {
            return 'en';
        }

        // window-info-language 값을 읽어서 초기 언어 설정
        let infoLang = window.navigator.language || (window.navigator as any).userLanguage;
        infoLang = infoLang.toLowerCase();
        if (infoLang) {
            if (infoLang.includes('ko')) return 'ko';
            if (infoLang.includes('zh')) return 'zh';
            if (infoLang.includes('ja')) return 'ja';
        }
        
        return 'en'; // 기본값 영어
    }

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
