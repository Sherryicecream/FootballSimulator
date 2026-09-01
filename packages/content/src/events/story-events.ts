import type { EventDefinition } from '@football/contracts';

export const shortStoryEvents: EventDefinition[] = [
  {
    id: 'position-race-opening',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 18,
    title: '位置竞争的开始',
    description: '同位置的竞争者抢走了不少出场时间，你希望用更明确的方式做出回应。',
    condition: { requirePersonRole: 'rival', playerRoles: ['fringe', 'rotation', 'regular'] },
    participantRoles: ['rival', 'youth-coach'],
    storyId: 'position-race-opened',
    nextEvents: ['position-race-review'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'compete',
        text: '正面竞争同一位置',
        riskLabel: 'medium',
        effects: { confidence: 3, fatigue: 4, respect: 2 },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}没有回避你的目光：“那就让训练场决定谁更适合。”',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“竞争不是互相消耗，是把位置的标准一起抬高。”',
          },
        ],
        response:
          '你把竞争者的挑战接了下来，训练中的每一次触球都开始带着比较的意味。你更累了，但也第一次清楚知道自己要补上什么。',
        followUp:
          '教练会在接下来几周记录你们的稳定性和临场选择；这条竞争线会随着比赛表现继续推进。',
      },
      {
        id: 'observe',
        text: '先观察他的优点和要领',
        riskLabel: 'low',
        effects: { confidence: 1, coachTrust: 2 },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}发现你在观察他的跑位，下一次训练故意把节奏提得更快。',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“看懂他的长处，再决定哪些东西值得学。”',
          },
        ],
        response:
          '你没有立刻把竞争变成对抗，而是记下了对方在无球移动和接球前观察上的优势。比较不再只是压力，也成了一份资料。',
        followUp:
          '下一次训练你会被要求把观察到的细节用出来；只有转化成自己的动作，分析才会改变位置竞争。',
      },
    ],
  },
  {
    id: 'position-race-review',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 26,
    title: '位置竞争的进展',
    description: '你在训练和比赛里的表现被拿来与竞争者比较，教练分别找你们谈了话。',
    condition: {
      requireStoryId: 'position-race-opened',
      requireFactType: 'match',
      requirePersonRole: 'rival',
    },
    participantRoles: ['rival', 'youth-coach'],
    storyId: 'position-race-reviewed',
    nextEvents: ['position-race-resolution'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'details',
        text: '认真听取点评并改进细节',
        riskLabel: 'low',
        effects: { coachTrust: 3, respect: 2 },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}听见你愿意调整细节，训练后把自己的站位经验也告诉了你。',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“你们的差距不在一句评价里，要看谁能把细节保持住。”',
          },
        ],
        response:
          '教练指出了你在接球前少看一眼的问题。你没有急着比较数据，而是把这一个细节带进当天剩下的每次对抗。',
        followUp:
          '教练会在后续比赛里继续观察你的无球选择；竞争者也在进步，位置不会因为一次认真听讲就固定下来。',
      },
      {
        id: 'intensity',
        text: '用加倍的训练强度去回应',
        riskLabel: 'medium',
        effects: { confidence: 3, fatigue: 5 },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}没有退让，反而在最后一组对抗中把身体对抗提到了更高强度。',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“强度能让你被看见，控制强度才让你留在名单里。”',
          },
        ],
        response:
          '你用更高强度的跑动回应比较，几次抢回球权让自己重新找回了气势。训练结束时，你的双腿却已经沉到影响动作。',
        followUp:
          '下一次比赛名单会参考你的积极性，也会参考恢复情况；过度消耗可能让竞争优势只停留在训练场。',
      },
    ],
  },
  {
    id: 'position-race-resolution',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 30,
    title: '位置竞争的抉择',
    description: '轮换顺序逐渐稳定，是守住原位置还是尝试改打新位置，竞争者的动向也影响着你的选择。',
    condition: { requireStoryId: 'position-race-reviewed', requirePersonRole: 'rival' },
    participantRoles: ['rival', 'youth-coach'],
    storyId: 'position-race-resolved',
    cooldownWeeks: 16,
    choices: [
      {
        id: 'same-role',
        text: '继续竞争原位置',
        riskLabel: 'medium',
        effects: { confidence: 4, fatigue: 3 },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}接受了你的选择：“那我们就在原位置继续比，别靠抱怨赢。”',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“原位置的机会有限，你要用连续表现守住它。”',
          },
        ],
        response:
          '你决定不绕开竞争，继续为熟悉的位置投入训练。选择很直接，也意味着每一次轮换都可能成为一次公开的比较。',
        followUp: '教练会在接下来阶段性地重新排序轮换；状态和体能的波动都会直接影响你的位置。',
      },
      {
        id: 'position-focus',
        text: '接受教练组的转型提议',
        riskLabel: 'medium',
        effects: { coachTrust: 4, confidence: 1 },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}点了点头：“换个位置也不代表离开竞争，只是比较方式变了。”',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“转型不是逃离原位置，是给你的能力找另一条路。”',
          },
        ],
        response:
          '你接受了教练组的转型建议，第一次训练新位置时几乎每个跑位都需要重新确认。熟悉的优势暂时变得不那么明显。',
        followUp:
          '接下来会有一段适应期；教练会观察你能否把原有能力带到新位置，而不是只看短期失误。',
      },
      {
        id: 'cooperate',
        text: '与竞争者形成轮换分工',
        riskLabel: 'low',
        effects: { respect: 4, closeness: 2 },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}主动和你确认轮换暗号：“谁先进入状态，另一个人就把空间补上。”',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“能把竞争变成配合，你们就都多了一种赢球方式。”',
          },
        ],
        response:
          '你们没有再把每次轮换看成输赢，而是约定了不同比赛阶段的分工。关系没有完全消除竞争，却多了一层可以依靠的默契。',
        followUp: '教练会在不同对手面前测试这套轮换；如果配合稳定，你们可能一起获得更多比赛时间。',
      },
    ],
  },
  {
    id: 'coach-trust-opening',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 17,
    title: '教练的特别指导',
    description: '教练认可你近期的态度，准备在训练之外给你一些专门的指点。',
    condition: { minCoachEvaluation: 50, requirePersonRole: 'youth-coach' },
    participantRoles: ['youth-coach'],
    storyId: 'coach-trust-opened',
    nextEvents: ['coach-trust-test'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'accept',
        text: '接受更多的指导',
        riskLabel: 'low',
        effects: { coachTrust: 3, fatigue: 2, confidence: 2 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“我会把要求说得更具体，你也要把执行结果带回来。”',
          },
        ],
        response:
          '你接受了教练额外安排的指导，训练结束后的时间被切成了更多复盘和修正。辛苦了一点，但你开始知道教练为什么反复强调某个细节。',
        followUp:
          '这份特别指导会在接下来的训练任务中接受检验；额外关注意味着更明确的机会，也意味着更清楚的责任。',
      },
      {
        id: 'ask-goal',
        text: '询问专项训练的具体要求',
        riskLabel: 'low',
        effects: { coachTrust: 2, confidence: 1 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“我希望你先提高第一脚处理的质量，再谈更复杂的变化。”',
          },
        ],
        response:
          '你没有只接受“继续努力”这句宽泛的鼓励，而是追问教练到底想看到什么。谈话结束时，你拿到了一份可以每天对照的目标。',
        followUp:
          '教练会根据这个专项目标给你安排阶段任务；完成标准变清楚后，进步和不足都会更容易被发现。',
      },
    ],
  },
  {
    id: 'coach-trust-test',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'training',
    interaction: 'decision',
    baseWeight: 25,
    title: '带着信任的考验',
    description: '教练把一组额外的训练任务交给你，希望你能在压力下坚决执行。',
    condition: {
      requireStoryId: 'coach-trust-opened',
      requireFactType: 'training',
      minCoachEvaluation: 48,
    },
    participantRoles: ['youth-coach'],
    storyId: 'coach-trust-tested',
    nextEvents: ['coach-trust-resolution'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'steady',
        text: '按要求完成任务',
        riskLabel: 'low',
        effects: { coachTrust: 3, confidence: 2, fatigue: 3 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“你没有急着炫技，这种稳定正是我想看到的。”',
          },
        ],
        response:
          '你按要求完成了每一项任务，期间几次动作并不漂亮，却都没有偏离目标。教练在最后一次记录旁边打了一个简短的勾。',
        followUp: '这份信任会让你获得更复杂的训练责任；保持稳定仍是下一阶段能否继续上升的前提。',
      },
      {
        id: 'improvise',
        text: '自行加大任务的难度',
        riskLabel: 'high',
        effects: { coachTrust: 1, confidence: 4, fatigue: 6 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“主动性很好，但先别把还没练稳的东西带进正式要求。”',
          },
        ],
        response:
          '你在完成基础任务后主动加了难度，有几次处理让旁边的人眼前一亮，也有几次让训练节奏被迫停下来。',
        followUp:
          '教练会保留你的创造性，同时要求你先把失误率降下来；更大的自由度需要更可靠的基础支撑。',
      },
    ],
  },
  {
    id: 'coach-trust-resolution',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 28,
    title: '信任之后的下一步',
    description: '考核接近尾声，教练准备正式把更重要的任务托付给你，交代得郑重其事。',
    condition: {
      requireStoryId: 'coach-trust-tested',
      requireFactType: 'training',
      minCoachEvaluation: 45,
    },
    participantRoles: ['youth-coach'],
    storyId: 'coach-trust-resolved',
    cooldownWeeks: 16,
    choices: [
      {
        id: 'guidance',
        text: '请求教练更细致的指导',
        riskLabel: 'low',
        effects: { coachTrust: 4, confidence: 2 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“愿意问清楚很好，但最后还是要靠你自己在场上判断。”',
          },
        ],
        response:
          '你请教练把最后几处细节讲得更清楚，直到自己能复述出每种场景下的第一选择。你得到的不是保证，而是一张更准确的地图。',
        followUp: '教练会逐渐减少口头提醒，观察你能否把指导内化成自己的阅读比赛方式。',
      },
      {
        id: 'responsibility',
        text: '争取承担更多的训练责任',
        riskLabel: 'medium',
        effects: { coachTrust: 2, confidence: 4, fatigue: 3 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“想带动别人，先让自己的每个回合都值得被跟上。”',
          },
        ],
        response:
          '你主动承担了分组训练中的组织任务，第一次喊出指令时声音还有些发紧。几次成功的站位调整后，队友开始真的听你的安排。',
        followUp: '教练会继续观察你的领导力是否建立在可靠表现上；额外责任也会让训练消耗更大。',
      },
      {
        id: 'reset',
        text: '先回到稳定的训练节奏',
        riskLabel: 'low',
        effects: { fatigue: -3, morale: 2 },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“知道什么时候稳住自己，也是信任之后该学的能力。”',
          },
        ],
        response:
          '你没有急着把信任换成更大的任务，而是先把每天的训练质量稳定下来。少了一点戏剧性，却让身体和心态都重新找到节拍。',
        followUp: '教练会把你放回稳定观察名单；等基础状态可靠后，新的责任仍会回来找你。',
      },
    ],
  },
];
