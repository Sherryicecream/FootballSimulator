import type { EventDefinition } from '@football/contracts';
import { createAuthoredResolution } from './authored-outcomes';

const asiaCondition = { requireOverseas: true, overseasRegions: ['asia'] as ('europe' | 'asia')[] };

/** asia-career：东亚（日本/韩国）留洋生涯事件，仅在留洋亚洲期间触发。 */
export const asiaCareerEvents: EventDefinition[] = [
  {
    id: 'asia-language-class',
    version: 1,
    category: 'asia-career',
    rarity: 'common',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 26,
    title: '东亚语言课',
    description:
      '俱乐部为亚洲联赛的外援球员安排了当地语言课，教练希望你尽快听懂更衣室里的呼喊和战术用语。每周两次的课会占去你仅有的休息时间。',
    condition: { ...asiaCondition },
    participantRoles: ['assistant-coach', 'teammate'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'attend-diligently',
        text: '坚持每周参加语言课，把日常用语一条条记下来',
        riskLabel: '低',
        effects: { closeness: 1, confidence: 1 },
                response: '你把语言课坚持了下来；能不能听懂更衣室，要看这几个月的功课做得怎么样。',
        followUp: '语言的学习曲线各不相同；教练和队友会根据你的进度调整和你的沟通方式。',
resolution: createAuthoredResolution('decision', 55, {
          success: {
            label: '语言上手',
            effects: { closeness: 3, confidence: 2, coachTrust: 1 },
            response: '一个月后，你已经能在防守时听懂队友的提醒，也会用当地话喊出最简单的那几句。',
            responses: [
              {
                speakerRole: 'assistant-coach',
                text: '{personName}：“现在训练里的指示你都能听懂了，这比多练两天更有用。”',
              },
              {
                speakerRole: 'teammate',
                text: '{personName}：“你叫我的名字时发音很标准，我们更像一队的了。”',
              },
            ],
            followUp: '更衣室的门开了一条缝；接下来几周，队友会在配合上给你更多口头提示。',
          },
          partial: {
            label: '进步缓慢',
            effects: { closeness: 1, confidence: 1 },
            response: '你勉强能应付点餐和打招呼，战术板上的长句还是要靠翻译慢慢转述。',
            followUp: '语言不是几周能解决的事，但队友注意到你在认真学，态度本身就是一种融入。',
          },
          failure: {
            label: '课业吃力',
            effects: { morale: -1, confidence: -1 },
            response: '连续的客场比赛让你缺了两节课，再回到教室时已经跟不上了，你把课本合上时有些沮丧。',
            followUp: '语言课暂时搁置了；在听懂队友之前，你只能用跑动和手势证明自己。',
          },
        }),
      },
      {
        id: 'focus-training',
        text: '把时间留给加练，语言的事慢慢来',
        riskLabel: '中',
        effects: { coachTrust: 1, closeness: -1 },
        response:
          '你选择把休息时间花在录像和加练上。教练认可你的职业态度，但更衣室里的笑声，你还需要更久才能听懂。',
        followUp: '表现是你的语言；在下一次关键配合之前，你和队友之间始终隔着一层翻译腔。',
      },
    ],
  },
  {
    id: 'asia-fan-culture',
    version: 1,
    category: 'asia-career',
    rarity: 'uncommon',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 20,
    title: '球迷开放日',
    description:
      '当地球迷对球队的新外援充满好奇，俱乐部安排了公开训练和签名会。看台上举着你的名字牌，用你不熟悉的语言拼出你的位置。',
    condition: { ...asiaCondition },
    participantRoles: ['teammate'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'join-open-day',
        text: '全程参加，并学着用当地话向球迷问好',
        riskLabel: '低',
        effects: { closeness: 2, confidence: 1 },
        response:
          '你那句发音不太标准的问候让看台笑成一片，也记住了你。签名会长队排到了场馆门口。',
        followUp: '球迷文化在这片联赛里是真实的第九人；下一次主场比赛，你会听到更响的加油声。',
      },
      {
        id: 'rest-instead',
        text: '向俱乐部说明疲劳情况，留在理疗房恢复',
        riskLabel: '中',
        effects: { fatigue: -2, closeness: -1 },
        response:
          '教练组同意让你优先恢复。你在理疗房看着队友和球迷互动的照片，心里盘算着用表现补回这一课。',
        followUp: '身体是留洋的本钱；球迷的印象分，留到你下一次在场上奔跑时再赚。',
      },
    ],
  },
  {
    id: 'asia-travel-fatigue',
    version: 1,
    category: 'asia-career',
    rarity: 'uncommon',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 22,
    title: '洲际远征归来',
    description:
      '一周双赛加上长途飞行，回到基地时你的小腿还是沉的。这里的客场动辄跨越海岸线，恢复节奏和国内完全不同。',
    condition: { ...asiaCondition, requireFactType: 'pro-match' },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'recovery-first',
        text: '申请明天以恢复课代替合练，先把长途飞行的影响排掉',
        riskLabel: '低',
        effects: { fatigue: -1 },
                response: '你按恢复方案调整了训练；长途赛程的影响需要几天才能看清。',
        followUp: '队医会跟踪你的恢复数据；下一个比赛周会检验这份安排。',
resolution: createAuthoredResolution('stamina', 52, {
          success: {
            label: '恢复到位',
            effects: { fitness: 2, fatigue: -3 },
            response: '泳池、拉伸和一整晚的睡眠把你重新充满。第二天的合练里，你是冲刺最快的那个。',
            followUp: '队医在记录里写下"恢复执行优秀"；这份自律会在轮换讨论时被再次提起。',
          },
          partial: {
            label: '缓慢回血',
            effects: { fitness: 1, fatigue: -1 },
            response: '恢复课让你轻了一些，但时差和疲劳还需要几天才能完全散去。',
            followUp: '下一场之前的每一晚睡眠都很关键；你给自己定了更严格的作息表。',
          },
          failure: {
            label: '反应不佳',
            effects: { fatigue: 2, fitness: -1 },
            response: '即便按计划恢复，你的腿还是灌了铅。队医建议你把期望放低，先熬过这一段。',
            followUp: '长途赛程的账总要还；接下来几周你会被更谨慎地使用。',
          },
        }),
      },
      {
        id: 'full-training',
        text: '照常合练，不想在位置竞争中掉队',
        riskLabel: '中',
        effects: { fatigue: 2, coachTrust: 1 },
        response:
          '你咬牙完成了全部合练。教练看到了你的态度，但体能教练在报告里标注了你的疲劳指数偏高。',
        followUp: '竞争不会等人；你要自己权衡这份透支会在哪一场比赛里找上门。',
      },
    ],
  },
  {
    id: 'asia-food-routine',
    version: 1,
    category: 'asia-career',
    rarity: 'common',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 18,
    title: '饮食与作息',
    description:
      '当地饮食和国内差别不小，队里庆祝聚餐也总在深夜。你有自己的习惯，但每次推脱都让饭桌安静一秒。',
    condition: { ...asiaCondition },
    participantRoles: ['teammate'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'follow-local-diet',
        text: '适度跟队友体验当地饮食，把聚餐当成融入的一部分',
        riskLabel: '低',
        effects: { closeness: 2, fitness: -1 },
        response:
          '你学会了用当地话点最常吃的那几样，也跟队友喝到了第一杯赛后饮料。饭桌上的话题开始有了你。',
        followUp: '适度参与让你更像队里的人；营养师会帮你把影响控制住。',
      },
      {
        id: 'keep-own-routine',
        text: '坚持自己做饭和作息，用状态说话',
        riskLabel: '中',
        effects: { fitness: 1, closeness: -1 },
        response:
          '你的冰箱和第一年在青训基地时一样规整。体能报告很干净，但队友们开始习惯聚餐时少叫一个人。',
        followUp: '自律没有错；你只是需要另找打开更衣室的方式。',
      },
    ],
  },
  {
    id: 'asia-home-media',
    version: 1,
    category: 'asia-career',
    rarity: 'uncommon',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 20,
    title: '本国媒体连线',
    description:
      '国内体育频道联系到你，想采访在亚洲联赛站稳脚跟的你。报道会连同你近期的比赛画面一起播出。',
    condition: { ...asiaCondition },
    participantRoles: ['family'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'open-interview',
        text: '接受连线，坦率聊留洋的得与失',
        riskLabel: '低',
        effects: { confidence: 2, respect: 1 },
        response:
          '你聊了语言、饮食和每一次坐替补席的心情。播出后，评论区都在说"这个球员很真实"。',
        followUp: '坦诚为你赢得了观众；也提醒着你，国门之外的每一场球都有人认真看着。',
      },
      {
        id: 'low-profile',
        text: '婉拒采访，请他们看比赛就好',
        riskLabel: '低',
        effects: { morale: 1 },
        response:
          '你把注意力留给了训练场。国内媒体在报道里写了一句"球员本人婉拒采访，专注赛场"，同样赢得了尊重。',
        followUp: '少一次曝光，多一晚休息；你的回答会由下一场比赛代说。',
      },
    ],
  },
  {
    id: 'asia-winter-rumor',
    version: 1,
    category: 'asia-career',
    rarity: 'rare',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 16,
    title: '冬窗传闻',
    description:
      '转会窗临近，有报道称欧洲球探在跟踪你近五场的表现。更衣室里开始有人拿这个开玩笑，教练的眼神也更深了。',
    condition: { ...asiaCondition, requireFactType: 'pro-match' },
    participantRoles: ['assistant-coach', 'teammate'],
    cooldownWeeks: 16,
    choices: [
      {
        id: 'public-commit',
        text: '公开表态：赛季结束前只考虑现在的球队',
        riskLabel: '中',
        effects: { coachTrust: 1 },
                response: '你对转会传闻表明了态度；舆论会放大其中的一部分。',
        followUp: '表态之后，你的每一场比赛都会被放在显微镜下。',
resolution: createAuthoredResolution('decision', 58, {
          success: {
            label: '立场赢得信任',
            effects: { coachTrust: 3, respect: 2 },
            response:
              '发布会上你的表态被完整引用。教练在当天训练里把战术板上的自由度又给你多划了一格。',
            responses: [
              {
                speakerRole: 'assistant-coach',
                text: '{personName}："更衣室都听说了。这种时候稳得住的人，关键时刻才敢把球交给你。"',
              },
            ],
            followUp: '信任是攒出来的；这个赛季剩下的比赛，你会被当作自己人使用。',
          },
          partial: {
            label: '平淡带过',
            effects: { coachTrust: 1 },
            response: '你的表态中规中矩，报道很快被下一轮比分盖过。教练点了个头，没有更多表示。',
            followUp: '一切照旧；传闻的意义要由你在场上的每一步决定。',
          },
          failure: {
            label: '言论被放大',
            effects: { morale: -2, coachTrust: -1 },
            response: '一句"未来谁知道呢"被剪成了标题。训练场上教练第一次没有和你对视。',
            followUp: '你需要用一段稳定的比赛把话题压回去；有些话，说过就要负责。',
          },
        }),
      },
      {
        id: 'stay-silent',
        text: '对传闻不置可否，让经纪人去应对',
        riskLabel: '中',
        effects: { morale: 1, coachTrust: -1 },
        response:
          '你把手机交给经纪人，自己照常训练。更衣室里没人再提这件事，但教练组的花名册上，你的名字旁边多了一个问号。',
        followUp: '沉默是转会期的常规操作；只是教练也在沉默地看着你。',
      },
    ],
  },
];
