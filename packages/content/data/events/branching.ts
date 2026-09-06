// 由既有 TS 内容源一次性生成（M11 模块 3 内容外置）；编辑后经 zod 校验生效。
import type { EventDefinition } from '@football/contracts';

export const branchingStoryEvents: EventDefinition[] = [
  {
    id: 'selection-bubble-opening',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 18,
    title: '入选边缘的信号',
    description:
      '上一场比赛后，教练把你留在空荡的会议室里。下一期名单还没有公布，但他已经开始谈论你能不能承担更大的比赛责任。',
    condition: {
      requireFactType: 'match',
      requirePersonRole: 'youth-coach',
      playerRoles: ['rotation', 'regular', 'starter', 'first-team-radar'],
      minWeek: 6,
    },
    participantRoles: ['youth-coach'],
    storyId: 'selection-bubble-opened',
    cooldownWeeks: 18,
    choices: [
      {
        id: 'ask-plan',
        text: '请教练给出一份明确的训练计划',
        riskLabel: 'low',
        effects: {
          coachTrust: 2,
          confidence: 1,
        },
        nextEventIds: ['selection-bubble-plan'],
        response:
          '你没有追问自己是不是已经被选中，而是请教练把差距拆成可以每天检查的动作。谈话结束时，名单仍未公布，但你至少知道下一次训练该证明什么。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“我不能保证你一定入选，但可以告诉你怎样让自己更接近名单。”',
          },
        ],
        followUp:
          '下一次训练报告会检验你是否真的执行了计划；机会正在靠近，但它仍然需要连续表现来确认。',
      },
      {
        id: 'take-risk',
        text: '主动要求参加更高强度的合练',
        riskLabel: 'high',
        effects: {
          confidence: 4,
          fatigue: 5,
          coachTrust: 1,
        },
        nextEventIds: ['selection-bubble-test'],
        response:
          '你直接要求和更高年龄段的队伍合练。第一个回合你被对手的速度逼得仓促出球，第二个回合却靠提前观察赢回了位置；教练记下了两种结果。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“敢接这个强度是优点，知道什么时候降低风险才会让它变成能力。”',
          },
        ],
        followUp:
          '下一场高强度合练会继续观察你的判断速度；如果疲劳影响动作，主动争取也可能变成负担。',
      },
    ],
  },
  {
    id: 'selection-bubble-plan',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'training',
    interaction: 'decision',
    baseWeight: 25,
    title: '名单之前的训练计划',
    description: '教练把上一场比赛的录像截成三个片段，要求你在本周训练中逐一修正。',
    condition: {
      requireStoryId: 'selection-bubble-opened',
      requireFactType: 'training',
      requirePersonRole: 'youth-coach',
    },
    participantRoles: ['youth-coach'],
    storyId: 'selection-bubble-planned',
    cooldownWeeks: 14,
    choices: [
      {
        id: 'follow-detail',
        text: '按三个片段逐项复盘，不追求一次改完',
        riskLabel: 'low',
        effects: {
          coachTrust: 3,
          confidence: 2,
          fatigue: 1,
        },
        response:
          '你把录像里的问题拆成三个小目标，每次训练只盯住一个。改变并不显眼，但到周末时，你在接球前多出的那一次观察已经不再需要提醒。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“这才是我想要的回应，名单看连续性，不看一次漂亮动作。”',
          },
        ],
        followUp: '教练会把你放进下一期名单的竞争范围；真正的入选仍取决于比赛中的稳定处理。',
      },
      {
        id: 'own-priority',
        text: '保留一个问题，优先打磨自己最有把握的优势',
        riskLabel: 'medium',
        effects: {
          confidence: 3,
          coachTrust: 1,
          fatigue: -1,
        },
        response:
          '你没有平均分配时间，而是先把最擅长的前插和接应做得更有威胁。教练看见了取舍，也提醒你不能永远用优势掩盖短板。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“知道自己靠什么赢得机会很好，但下一步要让对手猜不到你的边界。”',
          },
        ],
        followUp: '你可能更快得到一次展示优势的机会；如果对手封住熟悉路线，留下的问题会再次暴露。',
      },
    ],
  },
  {
    id: 'selection-bubble-test',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    theme: 'match',
    interaction: 'decision',
    baseWeight: 16,
    title: '更高强度的合练',
    description:
      '你获得了一次和高年龄段队伍合练的机会，教练只给了一个要求：不要把每个回合都踢成证明自己的舞台。',
    condition: {
      requireStoryId: 'selection-bubble-opened',
      requireFactType: 'match',
      requirePersonRole: 'youth-coach',
    },
    participantRoles: ['youth-coach'],
    storyId: 'selection-bubble-tested',
    cooldownWeeks: 20,
    choices: [
      {
        id: 'simplify',
        text: '先用简单处理站稳节奏',
        riskLabel: 'low',
        effects: {
          coachTrust: 3,
          confidence: 1,
          fatigue: -1,
        },
        response:
          '你先用一脚出球和提前回收把节奏稳定下来，直到对手不再轻易从你的身后切入。没有高光镜头，但你终于没有被强度带着走。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“你没有急着赢下每个回合，这让你的下一次选择更有价值。”',
          },
        ],
        followUp: '这次合练会为你增加可靠性评价；下一步是证明你在稳定之外也能制造真正的进攻差异。',
      },
      {
        id: 'force-impact',
        text: '主动寻找一两个改变比赛的冒险回合',
        riskLabel: 'high',
        effects: {
          confidence: 4,
          fatigue: 4,
          coachTrust: -1,
        },
        response:
          '你主动寻找纵深传球和提前前插，有一脚传球撕开了防线，也有两次冒险让球队差点丢掉转换机会。教练没有否定勇气，只把失误圈了出来。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“你已经证明自己敢做决定，现在要学会让队友知道你为什么这么做。”',
          },
        ],
        followUp: '你会得到更高的上限评价，但下一场名单讨论也会放大你在风险回合里的选择质量。',
      },
    ],
  },
  {
    id: 'recovery-return-opening',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 18,
    title: '回归训练的第一天',
    description:
      '队医允许你恢复部分合练，但没有批准你立刻回到完整对抗。教练在场边等你决定今天要把回归推进到哪一步。',
    condition: {
      requireActiveInjury: true,
      requirePersonRole: 'youth-coach',
      minWeek: 8,
    },
    participantRoles: ['youth-coach'],
    storyId: 'recovery-return-opened',
    cooldownWeeks: 16,
    choices: [
      {
        id: 'follow-load',
        text: '按队医给出的负荷逐步恢复',
        riskLabel: 'low',
        effects: {
          fatigue: -5,
          coachTrust: 2,
          morale: 1,
        },
        nextEventIds: ['recovery-return-check'],
        response:
          '你把今天的目标从“证明自己已经好了”改成“完成规定负荷”。看着队友进入对抗，你有些不甘，但离场时身体没有发出新的警报。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“回归不是一场考试，能把每一步做完就是今天的成绩。”',
          },
        ],
        followUp: '下一次训练会检查你对负荷的反应；恢复得越稳，你重新进入比赛名单的时间越可预测。',
      },
      {
        id: 'push-return',
        text: '请求提前加入小组对抗',
        riskLabel: 'high',
        effects: {
          fatigue: 6,
          confidence: 3,
          coachTrust: -2,
        },
        nextEventIds: ['recovery-return-setback'],
        response:
          '你请求提前加入小组对抗，前几次触球让你重新找回比赛感，但一次急停后的紧绷提醒所有人：感觉回来，不等于身体已经准备好。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“我理解你想回来，但不能用一次训练去赌掉接下来的一个月。”',
          },
        ],
        followUp:
          '接下来会重新评估你的恢复节奏；如果不适持续，教练对你的信任和出场预期都会暂时降低。',
      },
    ],
  },
  {
    id: 'recovery-return-check',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 20,
    title: '回归后的身体信号',
    description:
      '逐步恢复后，你完成了一次完整训练。身体没有恶化，但最后一组动作的质量提醒你，复出仍然需要留出余量。',
    condition: {
      requireStoryId: 'recovery-return-opened',
      requireFactType: 'training',
      requirePersonRole: 'youth-coach',
    },
    participantRoles: ['youth-coach'],
    storyId: 'recovery-return-checked',
    cooldownWeeks: 14,
    choices: [
      {
        id: 'protect-next-match',
        text: '主动申请减少下一场的对抗负荷',
        riskLabel: 'low',
        effects: {
          fatigue: -4,
          coachTrust: 2,
          confidence: 1,
        },
        response:
          '你把最后一组动作的感觉如实告诉教练，接受下一场先从替补或短时间出场开始。回归没有被取消，只是多了一层保护。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“能读懂身体的反馈，才有资格把回归变成长期出场。”',
          },
        ],
        followUp: '下一场的出场时间会更有限，但只要反应稳定，你会重新获得完整训练和比赛的信任。',
      },
      {
        id: 'prove-full',
        text: '要求立刻按正常强度参加比赛',
        riskLabel: 'medium',
        effects: {
          confidence: 3,
          fatigue: 4,
          coachTrust: -1,
        },
        response:
          '你争取按正常强度回到比赛名单。教练同意给你机会，却把热身和出场时间写得比你期待的更保守。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“勇气可以加快你回到名单，但不能替身体完成恢复。”',
          },
        ],
        followUp:
          '你可能更早获得比赛机会，也会承担更高的复发风险；接下来每次训练反馈都会影响教练的判断。',
      },
    ],
  },
  {
    id: 'recovery-return-setback',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 14,
    title: '回归节奏被按下暂停',
    description:
      '提前对抗后，队医要求你重新检查。没有出现严重损伤，但恢复计划必须退回到更保守的一档。',
    condition: {
      requireStoryId: 'recovery-return-opened',
      requireFactType: 'match',
      requirePersonRole: 'youth-coach',
    },
    participantRoles: ['youth-coach'],
    storyId: 'recovery-return-setback',
    cooldownWeeks: 20,
    choices: [
      {
        id: 'accept-reset',
        text: '接受重新评估，先把恢复做完整',
        riskLabel: 'low',
        effects: {
          fatigue: -8,
          morale: -1,
          coachTrust: 1,
        },
        response:
          '你接受重新评估，把想尽快回到比赛的急切写进恢复日志，而不是带进下一次对抗。回归进度慢了，身体却重新回到可控范围。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“这次暂停不是惩罚，真正的职业选择有时就是多等一周。”',
          },
        ],
        followUp:
          '下一轮训练会从更低负荷重新开始；如果你能保持耐心，之前失去的信任仍能一点点修复。',
      },
      {
        id: 'hide-discomfort',
        text: '淡化不适，坚持按原计划训练',
        riskLabel: 'high',
        effects: {
          fatigue: 8,
          morale: -3,
          coachTrust: -4,
        },
        response:
          '你试图把不适说成“没什么”，但动作质量很快暴露了问题。教练叫停训练，重新把你从对抗名单里划掉。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“隐瞒一次感觉，可能让整个恢复周期都失去依据。”',
          },
        ],
        followUp:
          '短期内你会失去更多训练和比赛时间；重新取得信任，需要从诚实记录每一次身体反馈开始。',
      },
    ],
  },
];
