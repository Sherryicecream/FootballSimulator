import type { EventDefinition } from '@football/contracts';

export const balancedOneOffEvents: EventDefinition[] = [
  {
    id: 'underdog-starting-call',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'match',
    interaction: 'decision',
    baseWeight: 24,
    title: '对阵弱旅的追加通知',
    description: '球探报告证实对手并不强大，但比赛时间调整得很紧，教练组在名单上写下了你的名字。',
    condition: {
      requireFactType: 'match',
      playerRoles: ['rotation', 'regular', 'starter'],
      minCoachEvaluation: 48,
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'prepare',
        text: '研究对手录像后稳步上阵',
        riskLabel: 'low',
        effects: { confidence: 3, fatigue: 2, coachTrust: 2 },
        response:
          '你把对手最常用的进攻路线记在了笔记上，临上场前反而比平时更安静。教练看到你的准备，没有再叮嘱第二遍。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“先把自己的位置站住，机会自然会来。”',
          },
        ],
        followUp:
          '这场比赛你会更早进入状态；如果能把录像里的判断兑现出来，教练对你的比赛准备会更有信心。',
      },
      {
        id: 'attack',
        text: '主动要求承担更强的进攻任务',
        riskLabel: 'medium',
        effects: { confidence: 5, fatigue: 5, coachTrust: 1 },
        response:
          '你主动走到教练面前要了更大的进攻责任。这个要求让替补席短暂安静下来，但教练最终在战术板上给你留出了一个前插区域。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“想要更多球权，就先证明你能把风险收回来。”',
          },
        ],
        followUp:
          '接下来的比赛你会得到更多向前处理球的机会，也必须承担丢失球权后回防不及时的代价。',
      },
    ],
  },
  {
    id: 'emergency-substitute',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    theme: 'match',
    interaction: 'automatic',
    baseWeight: 28,
    title: '临时替补待命',
    description: '队友在赛前临时出现身体问题，你被临时叫去准备替补登场。',
    condition: { requireFactType: 'match', playerRoles: ['fringe', 'rotation', 'regular'] },
    cooldownWeeks: 8,
    choices: [
      {
        id: 'step-in',
        text: '迅速热身，随时准备登场',
        riskLabel: 'low',
        effects: { morale: 2, form: 2, fatigue: 2 },
      },
    ],
  },
  {
    id: 'costly-match-mistake',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'match',
    interaction: 'decision',
    baseWeight: 20,
    title: '一次失误葬送小胜机会',
    description: '一次关键失球导致球队被逼平，教练要求你回顾录像并作出回应。',
    condition: { requireFactType: 'match', maxConfidence: 55 },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'review',
        text: '冷静复盘全部失球录像',
        riskLabel: 'low',
        effects: { confidence: 2, coachTrust: 3 },
        response:
          '你没有跳过那几个最刺眼的回合，而是把每一次站位和回追路线都倒回去看了一遍。复盘结束时，失误不再只是一个模糊的懊悔。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“能把问题看具体，下一次就有改的入口。”',
          },
        ],
        followUp:
          '下一场训练教练会观察你在相同区域的第一步选择；如果改动有效，这次失误会变成一条可复用的经验。',
      },
      {
        id: 'move-on',
        text: '放下失误，专注下一场比赛',
        riskLabel: 'medium',
        effects: { morale: 2, confidence: -1 },
        response:
          '你关掉了录像，没有让这次失误继续占据整晚。第二天训练时你看起来轻松了些，但那脚传球的画面仍在关键时刻提醒着你。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“向前看没有错，但别把该记住的细节也一起丢掉。”',
          },
        ],
        followUp:
          '下一场比赛会给你一次重新处理类似局面的机会；结果好坏取决于你是否真的记住了上次的选择。',
      },
    ],
  },
  {
    id: 'weak-foot-workshop',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    theme: 'training',
    interaction: 'decision',
    baseWeight: 26,
    title: '弱脚专项加练',
    description: '助理教练为你安排了一组弱侧专项课，训练强度不小，但补齐短板很重要。',
    condition: { personalityTendencies: ['disciplined', 'composed', 'ambitious'] },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 8,
    choices: [
      {
        id: 'repeat',
        text: '按计划完成全部弱侧练习',
        riskLabel: 'low',
        effects: { confidence: 2, fatigue: 3 },
        response:
          '你按助教安排的节奏完成了每一组弱脚触球，没有因为动作生疏就提前结束。最后一组传接时，球终于不再弹离你的惯用脚一侧。',
        responses: [
          {
            speakerRole: 'assistant-coach',
            text: '{personName}：“先把稳定做出来，漂亮的动作会自己出现。”',
          },
        ],
        followUp:
          '接下来几周训练中，你会继续遇到弱侧处理球；稳定完成它，才可能把这项能力带进正式比赛。',
      },
      {
        id: 'challenge',
        text: '加入对抗训练检验成果',
        riskLabel: 'medium',
        effects: { confidence: 3, fatigue: 5 },
        response:
          '你把刚练的弱脚技术直接带进对抗。第一次尝试被对手识破，第二次你提前抬头，终于把球送到了跑动线路上。',
        responses: [
          {
            speakerRole: 'assistant-coach',
            text: '{personName}：“敢在对抗里用出来，训练才算真正开始。”',
          },
        ],
        followUp:
          '教练组会在下一次分组对抗中继续测试你的弱侧选择；高强度尝试也会让你需要更认真地恢复。',
      },
    ],
  },
  {
    id: 'technical-plateau',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'training',
    interaction: 'decision',
    baseWeight: 22,
    title: '技术瓶颈',
    description: '熟悉的专项训练没有带来突破，你开始反思原因，怀疑是不是练习方式出了问题。',
    condition: { maxConfidence: 58, requireFactType: 'training' },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'adjust',
        text: '和教练调整训练的重点',
        riskLabel: 'low',
        effects: { confidence: 2, coachTrust: 2 },
        response:
          '你承认原来的练习没有带来突破，并和教练把动作拆成了几个更小的环节。训练计划没有变得更热闹，却终于有了可以检查的进度。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“瓶颈不是停下来的证据，是提醒我们换一种问法。”',
          },
        ],
        followUp:
          '接下来两周会围绕新的训练重点观察你的细节质量；短期数据不一定漂亮，但进步会更容易被看见。',
      },
      {
        id: 'persist',
        text: '坚持重复直到动作稳定',
        riskLabel: 'medium',
        effects: { confidence: 1, fatigue: 4 },
        response:
          '你没有更换训练内容，只是把同一组动作又做了一遍。枯燥让时间变慢，但最后几次触球的失误确实少了一点。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“重复有价值，但要记得每一组都给自己一个修正目标。”',
          },
        ],
        followUp: '如果你能在疲劳下仍保持动作质量，教练会把这项能力带进下一次有对抗的训练。',
      },
    ],
  },
  {
    id: 'recovery-session-warning',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    theme: 'training',
    interaction: 'automatic',
    baseWeight: 32,
    title: '恢复性课程安排',
    description: '助理教练注意到你的疲劳指数偏高，已经把今天的训练内容换成了恢复课程。',
    condition: { minFatigue: 60 },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 6,
    choices: [
      {
        id: 'recover',
        text: '配合理疗完成低强度恢复',
        riskLabel: 'low',
        effects: { fatigue: -6, fitness: 2 },
      },
    ],
  },
  {
    id: 'coach-video-review',
    version: 1,
    category: 'dressing-room',
    rarity: 'common',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 14,
    title: '教练房里的录像课',
    description: '训练结束后，教练单独把你留下，一起回看比赛录像中的几个关键回合。',
    condition: { requireFactType: 'match', requirePersonRole: 'youth-coach' },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 8,
    choices: [
      {
        id: 'listen',
        text: '认真接受教练的分析',
        riskLabel: 'low',
        effects: { coachTrust: 3, confidence: 2 },
        response:
          '你先听完教练对每个回合的判断，只在确认自己理解后才记下修正点。离开录像室时，你已经知道下一次应该提前看哪里。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“记住，好的位置感来自下一秒之前的观察。”',
          },
        ],
        followUp:
          '下一场训练教练会把录像里的细节转成一个小任务；完成它会比泛泛地“踢得更好”更能改变评价。',
      },
      {
        id: 'explain',
        text: '解释自己当时的判断',
        riskLabel: 'medium',
        effects: { coachTrust: 1, confidence: 3 },
        response:
          '你没有急着为失误辩解，而是把当时看到的空间和队友跑位如实讲了出来。教练不同意你的结论，却愿意继续追问你的判断过程。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“我可以接受你的想法，但下一次要让它更快、更清楚。”',
          },
        ],
        followUp: '教练会在下次训练给你一个相似场景，看看你能否把解释变成更及时的场上决定。',
      },
    ],
  },
  {
    id: 'senior-youth-guidance',
    version: 1,
    category: 'dressing-room',
    rarity: 'common',
    theme: 'relationships',
    interaction: 'automatic',
    baseWeight: 24,
    title: '队长的训练忠告',
    description: '一位年长队友在训练后拉住你，分享他当年适应高强度对抗的经验。',
    condition: { requirePersonRole: 'teammate' },
    participantRoles: ['teammate'],
    cooldownWeeks: 8,
    choices: [
      {
        id: 'remember',
        text: '把建议记下来并加入恢复练习',
        riskLabel: 'low',
        effects: { confidence: 2, respect: 2 },
      },
    ],
  },
  {
    id: 'teammate-misunderstanding',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 20,
    title: '训练场上的误会',
    description: '一次配合中的误会让你和队友在训练里出现了几句争执。',
    condition: {
      requirePersonRole: 'teammate',
      personalityTendencies: ['expressive', 'ambitious'],
    },
    participantRoles: ['teammate'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'clarify',
        text: '主动说出自己的想法',
        riskLabel: 'low',
        effects: { closeness: 2, respect: 2 },
        response:
          '你在训练结束后把自己的意图说了出来，队友也承认他当时只看到了结果。两个人没有立刻变得亲密，但下一次传球前都多看了一眼。',
        responses: [
          { speakerRole: 'teammate', text: '{personName}：“下次我会先喊一声，别让你猜我的跑位。”' },
        ],
        followUp:
          '接下来的合练会检验这次沟通是否有效；一次更顺畅的配合，可能比口头道歉更快修复默契。',
      },
      {
        id: 'train',
        text: '用一次完美配合做出回应',
        riskLabel: 'medium',
        effects: { respect: 3, fatigue: 2 },
        response:
          '你没有再解释那次争执，而是在下一轮对抗中提前启动，把球送到队友最舒服的线路上。他接球后回头点了点头。',
        responses: [
          { speakerRole: 'teammate', text: '{personName}：“这次我知道你要什么了，继续这样踢。”' },
        ],
        followUp:
          '这次配合暂时压过了之前的不快，但如果沟通仍然缺席，下一次误会仍可能从同一个位置发生。',
      },
    ],
  },
  {
    id: 'school-exam-week',
    version: 1,
    category: 'off-pitch',
    rarity: 'common',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 30,
    title: '考试周来临',
    description: '文化课考试恰好和比赛撞车，你需要重新安排训练、复习和休息时间。',
    condition: { growthBackgrounds: ['school'] },
    cooldownWeeks: 10,
    choices: [
      {
        id: 'plan',
        text: '提前规划好详细的时间表',
        riskLabel: 'low',
        effects: { confidence: 2, fatigue: 2 },
        response:
          '你把复习、训练和通勤时间全部写进同一张表，连恢复时间也没有省略。安排看起来很满，但至少每件事都有了明确的开始和结束。',
        followUp: '考试周里训练和比赛仍可能临时变动；能否及时调整计划，会成为你真正的课题。',
      },
      {
        id: 'football-first',
        text: '先备战比赛，之后再补课',
        riskLabel: 'medium',
        effects: { morale: 2, fatigue: 4 },
        response:
          '你把更多时间留给了赛前准备，比赛日的状态确实更集中。回到学校后，堆在桌上的练习册也让你意识到这笔时间并没有消失。',
        followUp:
          '如果下一次仍要在比赛和学业之间取舍，你需要用更具体的补课计划换取老师和家人的理解。',
      },
    ],
  },
  {
    id: 'hometown-community-message',
    version: 1,
    category: 'off-pitch',
    rarity: 'common',
    theme: 'off-pitch',
    interaction: 'automatic',
    baseWeight: 24,
    title: '家乡球场的消息',
    description: '家乡球场的比赛视频被转发后，老家的球友们都在关注你的表现。',
    condition: { growthBackgrounds: ['community'], requireRelocation: false },
    cooldownWeeks: 8,
    choices: [
      { id: 'reply', text: '回复消息并致以感谢', riskLabel: 'low', effects: { morale: 4 } },
    ],
  },
  {
    id: 'idol-training-note',
    version: 1,
    category: 'off-pitch',
    rarity: 'rare',
    theme: 'off-pitch',
    interaction: 'automatic',
    baseWeight: 12,
    title: '偶像的训练笔记',
    description: '训练营里流传着一份职业球员的手写训练笔记，其中的细节让你大受启发。',
    condition: { requireFactType: 'monthly-settlement', minReputation: 10 },
    cooldownWeeks: 20,
    choices: [
      {
        id: 'note',
        text: '摘录适合自己的部分记进笔记',
        riskLabel: 'low',
        effects: { confidence: 3, morale: 2 },
      },
    ],
  },
  {
    id: 'local-fan-attention',
    version: 1,
    category: 'off-pitch',
    rarity: 'uncommon',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 18,
    title: '看台上的关注',
    description: '看台上有球迷举着写有你名字的牌子，这份热情让你既感动又有些分心。',
    condition: { requireFactType: 'match', minReputation: 12 },
    cooldownWeeks: 14,
    choices: [
      {
        id: 'meet',
        text: '挥手致意并简单交流',
        riskLabel: 'low',
        effects: { morale: 3, fatigue: 1 },
        response:
          '你走到看台边和球迷打了招呼，没有让短暂的交流变成喧闹。回到训练场时，那张写着你名字的牌子还在，但你的注意力已经收了回来。',
        followUp: '声望会带来更多关注；下一次表现不佳时，你也会更早感受到看台的目光。',
      },
      {
        id: 'leave',
        text: '保持礼貌然后安静离开',
        riskLabel: 'low',
        effects: { confidence: 1 },
        response:
          '你礼貌地挥手后离开看台，把注意力重新放回当天的训练。那份热情没有被拒绝，只是被你放在了更合适的距离之外。',
        followUp: '球迷的关注不会因为一次克制的回应消失；你仍要用稳定表现让这份关注有理由继续。',
      },
    ],
  },
  {
    id: 'return-to-full-training',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 28,
    title: '重返全队的节点',
    description: '伤势已经好转，医疗组允许逐步恢复，教练组想听听你对强度的取舍。',
    condition: { requireActiveInjury: true, maxFatigue: 70 },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'gradual',
        text: '按计划逐步恢复训练量',
        riskLabel: 'low',
        effects: { fitness: 3, fatigue: -2, confidence: 2 },
        response:
          '你按医疗组划出的强度完成了恢复训练，没有因为一次顺利的变向就急着加码。离开场地时，你感觉自己终于在重新掌控身体。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“回来不是越快越好，是要能一直回来。”',
          },
        ],
        followUp: '接下来两周会逐步增加对抗和跑动；恢复质量将决定你什么时候真正回到比赛名单。',
      },
      {
        id: 'full',
        text: '尽快参加合练找状态',
        riskLabel: 'medium',
        effects: { fitness: 2, fatigue: 5, confidence: 3 },
        response:
          '你主动加入合练，第一次冲刺时仍有些迟疑，但连续几次触球让你重新找回了比赛的感觉。训练结束后，伤处的紧绷也比预想中更明显。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“感觉回来了一半，剩下的一半不能靠逞强。”',
          },
        ],
        followUp: '教练会根据恢复反应决定是否让你进入下一场名单；过快加量可能让回归再次延后。',
      },
    ],
  },
  {
    id: 'confidence-slump-talk',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 26,
    title: '低谷期的谈话',
    description: '最近的状态不顺让训练也变得犹豫，教练问你是否愿意聊一聊。',
    condition: { maxConfidence: 40, requirePersonRole: 'youth-coach' },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'talk',
        text: '坦白说出自己的压力',
        riskLabel: 'low',
        effects: { confidence: 4, morale: 3, coachTrust: 1 },
        response:
          '你把最近不敢要球、害怕失误的感觉说了出来。教练没有立刻给你一句漂亮的答案，而是和你把压力拆成了几个能在训练中处理的小问题。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“先把下一次正确的选择做出来，不必一次解决整个低谷。”',
          },
        ],
        followUp:
          '接下来几次训练会有小目标帮助你找回信心；是否恢复节奏，要看你能否接受不完美的第一步。',
      },
      {
        id: 'private',
        text: '用加练找回一点节奏',
        riskLabel: 'medium',
        effects: { confidence: 2, fatigue: 4 },
        response:
          '你没有把低落说出口，而是在队友离开后留下来做基础练习。重复的触球让心情安静下来，却没有回答你为什么害怕下一次失误。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“加练能找回感觉，但别让它替你把真正的问题藏起来。”',
          },
        ],
        followUp:
          '如果状态仍然没有起色，教练可能会再次找你谈话；疲劳累积也会影响你找回节奏的速度。',
      },
    ],
  },
  {
    id: 'minor-pain-check',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    theme: 'health',
    interaction: 'automatic',
    baseWeight: 34,
    title: '小伤复查',
    description: '队医在训练前记录了几处不适的位置，需要你随时留意身体的反馈。',
    condition: { requireActiveInjury: true },
    cooldownWeeks: 6,
    choices: [
      {
        id: 'check',
        text: '仔细检查并调整训练量',
        riskLabel: 'low',
        effects: { fatigue: -4, fitness: 1 },
      },
    ],
  },
];
