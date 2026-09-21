// 由既有 TS 内容源一次性生成（M11 模块 3 内容外置）；编辑后经 zod 校验生效。
import type { EventDefinition } from '@football/contracts';
import { buildCountryCareerEvent, threeTierResolution } from './country-career';

export const japanCareerEvents: EventDefinition[] = [
  {
    id: 'asia-language-class',
    version: 1,
    category: 'asia-career',
    rarity: 'common',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 26,
    title: '日本语言与敬语课',
    description:
      '俱乐部为外援安排了日语和敬语课。训练之外，称呼、致意和听懂更衣室里的简短指令，都是被认真对待的团队规矩。',
    condition: {
      requireOverseas: true,
      overseasRegions: ['asia'],
      requireCountry: 'japan',
    },
    participantRoles: ['assistant-coach', 'teammate'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'attend-diligently',
        text: '坚持每周参加语言课，把日常用语一条条记下来',
        riskLabel: '低',
        effects: {
          closeness: 1,
          confidence: 1,
        },
        response: '你把语言课坚持了下来；能不能听懂更衣室，要看这几个月的功课做得怎么样。',
        followUp: '语言的学习曲线各不相同；教练和队友会根据你的进度调整和你的沟通方式。',
        resolution: {
          attribute: 'decision',
          difficulty: 55,
          volatility: 5,
          stateModifiers: {
            morale: 0,
            form: 0,
            confidence: 0,
            fitness: 0,
            fatigue: 0,
            coachTrust: 0,
          },
          outcomes: {
            success: {
              label: '语言上手',
              eventOutcome: 'adapted',
              effects: {
                closeness: 3,
                confidence: 2,
                coachTrust: 1,
              },
              response:
                '一个月后，你已经能在防守时听懂队友的提醒，也会用当地话喊出最简单的那几句。',
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
              effects: {
                closeness: 1,
                confidence: 1,
              },
              response: '你勉强能应付点餐和打招呼，战术板上的长句还是要靠翻译慢慢转述。',
              followUp: '语言不是几周能解决的事，但队友注意到你在认真学，态度本身就是一种融入。',
            },
            failure: {
              label: '课业吃力',
              effects: {
                morale: -1,
                confidence: -1,
              },
              response:
                '连续的客场比赛让你缺了两节课，再回到教室时已经跟不上了，你把课本合上时有些沮丧。',
              followUp: '语言课暂时搁置了；在听懂队友之前，你只能用跑动和手势证明自己。',
            },
          },
        },
      },
      {
        id: 'focus-training',
        text: '把时间留给加练，语言的事慢慢来',
        riskLabel: '中',
        effects: {
          coachTrust: 1,
          closeness: -1,
        },
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
    title: '主场礼仪与球迷开放日',
    description:
      '主场开放日安排了公开训练和签名会。工作人员提醒你按流程致意、耐心排队，球迷会把这种细节视为球队态度的一部分。',
    condition: {
      requireOverseas: true,
      overseasRegions: ['asia'],
      requireCountry: 'japan',
    },
    participantRoles: ['teammate'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'join-open-day',
        text: '全程参加，并学着用当地话向球迷问好',
        riskLabel: '低',
        effects: {
          closeness: 2,
          confidence: 1,
        },
        response: '你那句发音不太标准的问候让看台笑成一片，也记住了你。签名会长队排到了场馆门口。',
        followUp: '球迷文化在这片联赛里是真实的第九人；下一次主场比赛，你会听到更响的加油声。',
      },
      {
        id: 'rest-instead',
        text: '向俱乐部说明疲劳情况，留在理疗房恢复',
        riskLabel: '中',
        effects: {
          fatigue: -2,
          closeness: -1,
        },
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
    title: '日本客场的准点远征',
    description:
      '一周双赛加上跨岛远征，球队仍然按分钟执行集合和恢复安排。你的小腿很沉，却不能把准点和团队流程当成可有可无。',
    condition: {
      requireOverseas: true,
      overseasRegions: ['asia'],
      requireCountry: 'japan',
      requireFactType: 'pro-match',
    },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'recovery-first',
        text: '申请明天以恢复课代替合练，先把长途飞行的影响排掉',
        riskLabel: '低',
        effects: {
          fatigue: -1,
        },
        response: '你按恢复方案调整了训练；长途赛程的影响需要几天才能看清。',
        followUp: '队医会跟踪你的恢复数据；下一个比赛周会检验这份安排。',
        resolution: {
          attribute: 'stamina',
          difficulty: 52,
          volatility: 5,
          stateModifiers: {
            morale: 0,
            form: 0,
            confidence: 0,
            fitness: 0,
            fatigue: 0,
            coachTrust: 0,
          },
          outcomes: {
            success: {
              label: '恢复到位',
              effects: {
                fitness: 2,
                fatigue: -3,
              },
              response:
                '泳池、拉伸和一整晚的睡眠把你重新充满。第二天的合练里，你是冲刺最快的那个。',
              followUp: '队医在记录里写下"恢复执行优秀"；这份自律会在轮换讨论时被再次提起。',
            },
            partial: {
              label: '缓慢回血',
              effects: {
                fitness: 1,
                fatigue: -1,
              },
              response: '恢复课让你轻了一些，但时差和疲劳还需要几天才能完全散去。',
              followUp: '下一场之前的每一晚睡眠都很关键；你给自己定了更严格的作息表。',
            },
            failure: {
              label: '反应不佳',
              effects: {
                fatigue: 2,
                fitness: -1,
              },
              response: '即便按计划恢复，你的腿还是灌了铅。队医建议你把期望放低，先熬过这一段。',
              followUp: '长途赛程的账总要还；接下来几周你会被更谨慎地使用。',
            },
          },
        },
      },
      {
        id: 'full-training',
        text: '照常合练，不想在位置竞争中掉队',
        riskLabel: '中',
        effects: {
          fatigue: 2,
          coachTrust: 1,
        },
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
    title: '球队聚餐与作息规矩',
    description:
      '球队聚餐有固定的座次和时间，营养师也把恢复餐安排得很细。你有自己的习惯，但团队会观察你怎样参与共同生活。',
    condition: {
      requireOverseas: true,
      overseasRegions: ['asia'],
      requireCountry: 'japan',
    },
    participantRoles: ['teammate'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'follow-local-diet',
        text: '适度跟队友体验当地饮食，把聚餐当成融入的一部分',
        riskLabel: '低',
        effects: {
          closeness: 2,
          fitness: -1,
        },
        response:
          '你学会了用当地话点最常吃的那几样，也跟队友喝到了第一杯赛后饮料。饭桌上的话题开始有了你。',
        followUp: '适度参与让你更像队里的人；营养师会帮你把影响控制住。',
      },
      {
        id: 'keep-own-routine',
        text: '坚持自己做饭和作息，用状态说话',
        riskLabel: '中',
        effects: {
          fitness: 1,
          closeness: -1,
        },
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
    title: '校园联赛与本国媒体',
    description:
      '本国体育频道想采访你在日本联赛的适应情况，也想听你谈高中、大学联赛如何把球员带进职业队。俱乐部提醒你把队友和团队目标放在表达里。',
    condition: {
      requireOverseas: true,
      overseasRegions: ['asia'],
      requireCountry: 'japan',
    },
    participantRoles: ['family'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'open-interview',
        text: '接受连线，坦率聊留洋的得与失',
        riskLabel: '低',
        effects: {
          confidence: 2,
          respect: 1,
        },
        response: '你聊了语言、饮食和每一次坐替补席的心情。播出后，评论区都在说"这个球员很真实"。',
        followUp: '坦诚为你赢得了观众；也提醒着你，国门之外的每一场球都有人认真看着。',
      },
      {
        id: 'low-profile',
        text: '婉拒采访，请他们看比赛就好',
        riskLabel: '低',
        effects: {
          morale: 1,
        },
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
    title: '冬窗传闻与团队优先',
    description:
      '冬窗临近，有报道称海外球探在跟踪你近五场的表现。队友仍按日常流程训练，教练希望你先把团队承诺和个人选择分开。',
    condition: {
      requireOverseas: true,
      overseasRegions: ['asia'],
      requireCountry: 'japan',
      requireFactType: 'pro-match',
    },
    participantRoles: ['assistant-coach', 'teammate'],
    cooldownWeeks: 16,
    choices: [
      {
        id: 'public-commit',
        text: '公开表态：赛季结束前只考虑现在的球队',
        riskLabel: '中',
        effects: {
          coachTrust: 1,
        },
        response: '你对转会传闻表明了态度；舆论会放大其中的一部分。',
        followUp: '表态之后，你的每一场比赛都会被放在显微镜下。',
        resolution: {
          attribute: 'decision',
          difficulty: 58,
          volatility: 5,
          stateModifiers: {
            morale: 0,
            form: 0,
            confidence: 0,
            fitness: 0,
            fatigue: 0,
            coachTrust: 0,
          },
          outcomes: {
            success: {
              label: '立场赢得信任',
              effects: {
                coachTrust: 3,
                respect: 2,
              },
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
              effects: {
                coachTrust: 1,
              },
              response: '你的表态中规中矩，报道很快被下一轮比分盖过。教练点了个头，没有更多表示。',
              followUp: '一切照旧；传闻的意义要由你在场上的每一步决定。',
            },
            failure: {
              label: '言论被放大',
              effects: {
                morale: -2,
                coachTrust: -1,
              },
              response: '一句"未来谁知道呢"被剪成了标题。训练场上教练第一次没有和你对视。',
              followUp: '你需要用一段稳定的比赛把话题压回去；有些话，说过就要负责。',
            },
          },
        },
      },
      {
        id: 'stay-silent',
        text: '对传闻不置可否，让经纪人去应对',
        riskLabel: '中',
        effects: {
          morale: 1,
          coachTrust: -1,
        },
        response:
          '你把手机交给经纪人，自己照常训练。更衣室里没人再提这件事，但教练组的花名册上，你的名字旁边多了一个问号。',
        followUp: '沉默是转会期的常规操作；只是教练也在沉默地看着你。',
      },
    ],
  },
];

export const koreaCareerEvents: EventDefinition[] = [
  buildCountryCareerEvent({
    id: 'korea-service-window',
    country: 'korea',
    title: '队友的服役窗口',
    description:
      '韩国本土队友正在和俱乐部讨论服役安排。训练计划、合同长度和代表国家出场的愿望被放在同一张时间表上，整个团队都在帮他做长期决定。',
    theme: 'off-pitch',
    rarity: 'rare',
    baseWeight: 16,
    cooldownWeeks: 20,
    participantRoles: ['teammate', 'assistant-coach'],
    choices: [
      {
        id: 'support-planning',
        text: '尊重队友的安排，帮他把训练目标拆到眼前赛季',
        riskLabel: '低',
        effects: { closeness: 2, morale: 1 },
        response: '你没有替他做决定，只是在训练后陪他把眼前几个月的目标写清楚。',
        followUp: '职业生涯有时要面对制度和时间表，队友之间的理解本身就是支持。',
      },
      {
        id: 'push-for-now',
        text: '劝他只看当下，用表现争取更多荣誉',
        riskLabel: '中',
        effects: { confidence: 1, closeness: -1, fatigue: 1 },
        response: '你的话让他短暂振作，却也让他更难面对必须提前规划的现实。',
        followUp: '民族荣誉很重要，但长期决定不能只用一次比赛的情绪衡量。',
      },
    ],
  }),
  buildCountryCareerEvent({
    id: 'korea-national-pride',
    country: 'korea',
    title: '国旗旁的训练服',
    description:
      '国家队比赛日临近，俱乐部里的韩国球员把训练服叠得格外整齐。民族荣誉让大家兴奋，也让每一次失误都显得更沉重。',
    theme: 'trajectory',
    rarity: 'uncommon',
    baseWeight: 18,
    cooldownWeeks: 18,
    participantRoles: ['teammate', 'youth-coach'],
    choices: [
      {
        id: 'turn-pride-into-work',
        text: '把荣誉感转成训练目标，和队友一起提高标准',
        riskLabel: '中',
        effects: { determination: 2, coachTrust: 1, closeness: 1 },
        response: '你们把情绪放进跑动和回防，训练强度提高了，却没有变成互相指责。',
        followUp: '荣誉不是压力的终点，它可以成为团队愿意一起承担的标准。',
        resolution: threeTierResolution({
          attribute: 'determination',
          difficulty: 60,
          success: {
            label: '荣誉凝成合力',
            effects: { determination: 2, coachTrust: 2, closeness: 2 },
            response:
              '训练最后一组冲刺里，所有人都没有提前收步。教练说这才是代表球队和国家时需要的态度。',
            followUp: '民族荣誉最可靠的样子，是把个人情绪变成互相补位的行动。',
          },
          partial: {
            label: '保持专注',
            effects: { determination: 1, coachTrust: 1 },
            response: '你们完成了计划，却没有把兴奋延伸到每个训练细节。团队至少保持了稳定。',
            followUp: '荣誉感不必每天高涨，能在重要时刻守住标准同样重要。',
          },
          failure: {
            label: '压力变成急躁',
            effects: { morale: -2, confidence: -1 },
            response: '你太想证明自己，训练里几次提前出脚，反而让队友不得不反复补位。',
            followUp: '为国家而战的愿望需要沉下来，急躁不会让球衣更有分量。',
          },
        }),
      },
      {
        id: 'keep-routine',
        text: '按平常流程训练，不让外界期待改变自己的节奏',
        riskLabel: '低',
        effects: { discipline: 1, fatigue: -1 },
        response: '你照常完成恢复和训练，把国家队话题留到真正需要讨论的时候。',
        followUp: '稳定的日常是承受重大荣誉压力的一种方式。',
      },
      {
        id: 'share-the-stage',
        text: '主动听队友讲述他们对国家队的记忆',
        riskLabel: '低',
        effects: { closeness: 2, morale: 1 },
        response: '你听到不同年龄段对国家队的记忆，也更理解队友为何如此在意下一次征召。',
        followUp: '荣誉不只属于上场的人，也连接着一整个更衣室的经历。',
      },
    ],
  }),
  buildCountryCareerEvent({
    id: 'korea-team-first',
    country: 'korea',
    title: '先给团队鞠躬',
    description:
      '赛前仪式和集体致意被安排得很细。你想留下自己的个性，但教练强调，先完成团队流程才能让每个人安心进入比赛。',
    theme: 'relationships',
    rarity: 'common',
    baseWeight: 22,
    cooldownWeeks: 12,
    participantRoles: ['teammate', 'assistant-coach'],
    choices: [
      {
        id: 'follow-ritual',
        text: '按团队流程完成致意，并主动照顾新队友',
        riskLabel: '低',
        effects: { closeness: 2, coachTrust: 1, morale: 1 },
        response: '你没有把仪式当成负担，反而让第一次参加的队友不再手足无措。',
        followUp: '团队优先不是抹掉个人，而是先确保每个人都在同一页上。',
      },
      {
        id: 'keep-individuality',
        text: '完成必要流程，其余时间保留自己的赛前习惯',
        riskLabel: '中',
        effects: { confidence: 1, closeness: -1 },
        response: '你尊重集体安排，也在耳机和热身里保留了自己的节奏。',
        followUp: '融入和个性可以并存，前提是别让个人习惯打断团队准备。',
      },
    ],
  }),
  buildCountryCareerEvent({
    id: 'korea-pressing-standard',
    country: 'korea',
    title: '高强度训练的共同标准',
    description:
      '队里把跑动和回防指标公开给所有人，年轻球员希望你跟上老队员的标准。你可以追求数据，也可以先保证动作质量。',
    theme: 'training',
    rarity: 'uncommon',
    baseWeight: 20,
    cooldownWeeks: 14,
    participantRoles: ['teammate', 'assistant-coach'],
    choices: [
      {
        id: 'run-together',
        text: '和队友一起完成高强度跑动，互相提醒节奏',
        riskLabel: '中',
        effects: { stamina: 1, closeness: 1, fatigue: 2 },
        response: '你们没有把指标变成个人竞赛，而是让最后一组跑动保持同样的间距。',
        followUp: '共同标准的意义，是让高强度变成团队行为而不是一个人的表演。',
      },
      {
        id: 'protect-load',
        text: '按身体反馈调整负荷，先完成恢复和技术动作',
        riskLabel: '低',
        effects: { fatigue: -1, fitness: 1, coachTrust: 1 },
        response: '你没有追逐当天最高数据，训练师确认你的动作质量保持稳定。',
        followUp: '持续的强度需要判断，懂得保护身体也是对团队负责。',
      },
    ],
  }),
  buildCountryCareerEvent({
    id: 'korea-captain-courtesy',
    country: 'korea',
    title: '队长的赛前提醒',
    description:
      '队长在赛前逐一确认每个人的职责，最后才谈个人发挥。你发现这里的领导更像照顾秩序和关系，而不是大声发号施令。',
    theme: 'relationships',
    rarity: 'common',
    baseWeight: 19,
    cooldownWeeks: 16,
    participantRoles: ['teammate', 'assistant-coach'],
    choices: [
      {
        id: 'listen-first',
        text: '先听完队长的安排，再补充自己的观察',
        riskLabel: '低',
        effects: { closeness: 1, coachTrust: 1, decision: 1 },
        response: '你没有抢着表达，等职责确认后提出了一个关于对手跑位的提醒。',
        followUp: '尊重秩序不是沉默，而是让建议在团队真正准备好时被听见。',
      },
      {
        id: 'speak-early',
        text: '直接提出自己的方案，争取改变赛前安排',
        riskLabel: '中',
        effects: { confidence: 1, coachTrust: -1 },
        response: '你的建议有价值，但表达时机让部分队友需要重新确认自己的位置。',
        followUp: '个人判断很重要，团队优先也要求你把表达放进合适的顺序。',
      },
    ],
  }),
  buildCountryCareerEvent({
    id: 'korea-local-hero',
    country: 'korea',
    title: '本土英雄的期待',
    description:
      '一名韩国年轻队友在重要比赛前受到本地球迷热烈关注。你既是他的竞争者，也是帮助他承受期待的队友。',
    theme: 'off-pitch',
    rarity: 'uncommon',
    baseWeight: 18,
    cooldownWeeks: 18,
    participantRoles: ['teammate', 'family'],
    choices: [
      {
        id: 'share-attention',
        text: '主动把采访话题引回球队和他的努力',
        riskLabel: '低',
        effects: { respect: 2, closeness: 1, morale: 1 },
        response: '你没有抢走聚光灯，而是让外界看见他背后训练和团队配合的部分。',
        followUp: '民族荣誉和个人期待容易集中在一个名字上，队友可以帮它重新回到团队。',
      },
      {
        id: 'focus-on-self',
        text: '保持低调，只准备自己的比赛任务',
        riskLabel: '低',
        effects: { confidence: 1, fatigue: -1 },
        response: '你没有参与外界话题，把精力留给了自己的位置和恢复。',
        followUp: '不主动成为故事的一部分，也是一种稳定团队的方式。',
      },
    ],
  }),
];

export const asiaCareerEvents: EventDefinition[] = [...japanCareerEvents, ...koreaCareerEvents];
