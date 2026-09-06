// 由既有 TS 内容源一次性生成（M11 模块 3 内容外置）；编辑后经 zod 校验生效。
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
    condition: {
      requirePersonRole: 'rival',
      playerRoles: ['fringe', 'rotation', 'regular'],
    },
    participantRoles: ['rival', 'youth-coach'],
    storyId: 'position-race-opened',
    nextEvents: ['position-race-review'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'compete',
        text: '正面竞争同一位置',
        riskLabel: 'medium',
        effects: {
          confidence: 3,
          fatigue: 4,
          respect: 2,
        },
        resolution: {
          attribute: 'determination',
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
              label: '竞争中建立优势',
              effects: {
                confidence: 4,
                fatigue: 4,
                respect: 3,
              },
              response:
                '你把竞争者的挑战接下，在高强度对抗里连续完成关键回合，优势第一次变得可量化。',
              responses: [
                {
                  speakerRole: 'rival',
                  text: '{personName}：“这次你赢了几个回合，但我会继续追上来。”',
                },
              ],
              followUp: '教练会根据连续训练和比赛表现重新评估轮换顺序。',
            },
            partial: {
              label: '竞争保持开放',
              effects: {
                confidence: 3,
                fatigue: 4,
                respect: 2,
              },
              response: '你敢于正面竞争，表现有亮点也有波动，暂时还不足以改变轮换顺序。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“竞争不是一天定胜负，先把稳定性保持住。”',
                },
              ],
              followUp: '接下来几周会继续记录你们在压力回合里的选择。',
            },
            failure: {
              label: '竞争暂时失势',
              effects: {
                confidence: -2,
                fatigue: 8,
                respect: -1,
              },
              response: '你把强度推得很高，却在关键对抗里连续失位，竞争者抓住机会领先了一步。',
              responses: [
                {
                  speakerRole: 'rival',
                  text: '{personName}：“我会把今天的空当记住，下一次你得更快。”',
                },
              ],
              followUp: '教练会让你回到基础站位训练，再决定下一次竞争机会。',
            },
          },
        },
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
        effects: {
          confidence: 1,
          coachTrust: 2,
        },
        resolution: {
          attribute: 'vision',
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
              label: '观察转成能力',
              effects: {
                confidence: 2,
                coachTrust: 3,
              },
              response:
                '你把竞争者的无球观察带进分组对抗，提前抬头的一次选择让自己赢得了新的空间。',
              responses: [
                {
                  speakerRole: 'rival',
                  text: '{personName}：“你看得很快，这个优点我不能再给你第二次机会。”',
                },
              ],
              followUp: '教练会在下一场比赛观察你是否能主动发现空间，而不是只复制对手。',
            },
            partial: {
              label: '观察得到验证',
              effects: {
                confidence: 1,
                coachTrust: 2,
              },
              response:
                '你记录下竞争者的优点，也尝试在训练里使用；转化还不稳定，但比较开始变成资料。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“看懂只是起点，下一次要把它变成自己的动作。”',
                },
              ],
              followUp: '接下来训练会给你更多相似回合，检验观察能否转成选择。',
            },
            failure: {
              label: '只观察没有转化',
              effects: {
                confidence: -1,
                coachTrust: -1,
              },
              response: '你记住了竞争者的跑位，却在真正对抗时仍按旧习惯行动，分析没有进入脚下。',
              responses: [
                {
                  speakerRole: 'rival',
                  text: '{personName}：“看得懂不代表做得到，下一次我会继续把节奏提快。”',
                },
              ],
              followUp: '教练会缩小任务到一个可执行细节，先让观察变成动作。',
            },
          },
        },
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
        effects: {
          coachTrust: 3,
          respect: 2,
        },
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
              label: '细节改变评价',
              effects: {
                coachTrust: 4,
                respect: 3,
              },
              response:
                '你把教练指出的接球前观察带进剩余对抗，连续几次提前处理让竞争者也开始参考你的站位。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“细节被保持住，才会真正改变你们的差距。”',
                },
              ],
              followUp: '后续比赛会继续检验你的无球选择，竞争者也会同步进步。',
            },
            partial: {
              label: '点评转成训练目标',
              effects: {
                coachTrust: 3,
                respect: 2,
              },
              response: '你认真听完点评，并在当天训练里完成了几次修正；稳定性仍需要比赛来证明。',
              responses: [
                {
                  speakerRole: 'rival',
                  text: '{personName}：“你愿意调整，这比一句不服气更有用。”',
                },
              ],
              followUp: '下一次高压比赛会检验这个细节是否已经成为习惯。',
            },
            failure: {
              label: '点评没有被执行',
              effects: {
                coachTrust: -2,
                respect: -1,
                confidence: -1,
              },
              response: '你听懂了教练的建议，却在对抗里急着证明自己，关键回合再次少看了一眼。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“听懂和做到之间还有距离，先把第一个观察动作固定下来。”',
                },
              ],
              followUp: '教练会暂时减少复杂任务，观察你能否恢复可靠的基本选择。',
            },
          },
        },
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
        effects: {
          confidence: 3,
          fatigue: 5,
        },
        resolution: {
          attribute: 'determination',
          difficulty: 60,
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
              label: '强度回应被看见',
              effects: {
                confidence: 4,
                fatigue: 5,
              },
              response:
                '你提高训练强度后仍能控制动作质量，最后一组对抗赢下关键回合，积极性终于没有以失误为代价。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“强度让你被看见，控制强度才让你留在名单里。”',
                },
              ],
              followUp: '下一场比赛名单会同时参考你的积极性和恢复情况。',
            },
            partial: {
              label: '强度带来亮点',
              effects: {
                confidence: 3,
                fatigue: 5,
              },
              response: '你用更高强度的跑动回应比较，几次抢回球权，但疲劳也让最后几次动作变慢。',
              responses: [
                {
                  speakerRole: 'rival',
                  text: '{personName}：“你追得很凶，但比赛不会只给你最后一组机会。”',
                },
              ],
              followUp: '教练会观察你能否把强度分配到完整训练和比赛。',
            },
            failure: {
              label: '过度消耗反噬',
              effects: {
                confidence: -2,
                fatigue: 8,
                coachTrust: -1,
              },
              response:
                '你把训练强度推过了当前承受范围，后半段失误增多，竞争者反而在稳定性上领先。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“想赢下位置可以，但不能把自己先练到失去选择。”',
                },
              ],
              followUp: '下一次训练会降低负荷，先恢复动作质量再谈继续加码。',
            },
          },
        },
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
    condition: {
      requireStoryId: 'position-race-reviewed',
      requirePersonRole: 'rival',
    },
    participantRoles: ['rival', 'youth-coach'],
    storyId: 'position-race-resolved',
    cooldownWeeks: 16,
    choices: [
      {
        id: 'same-role',
        text: '继续竞争原位置',
        riskLabel: 'medium',
        effects: {
          confidence: 4,
          fatigue: 3,
        },
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
        effects: {
          coachTrust: 4,
          confidence: 1,
        },
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
        effects: {
          respect: 4,
          closeness: 2,
        },
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
    condition: {
      minCoachEvaluation: 50,
      requirePersonRole: 'youth-coach',
    },
    participantRoles: ['youth-coach'],
    storyId: 'coach-trust-opened',
    nextEvents: ['coach-trust-test'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'accept',
        text: '接受更多的指导',
        riskLabel: 'low',
        effects: {
          coachTrust: 3,
          fatigue: 2,
          confidence: 2,
        },
        resolution: {
          attribute: 'decision',
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
              label: '指导转成清晰目标',
              effects: {
                coachTrust: 4,
                fatigue: 2,
                confidence: 3,
              },
              response:
                '你接受额外指导并把每个要求拆成当天能完成的任务，训练结束时已经能解释自己为什么这样处理。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“要求变具体了，执行结果也要同样具体。”',
                },
              ],
              followUp: '下一次训练会按这份目标逐项检查，不再只看泛泛的态度。',
            },
            partial: {
              label: '获得阶段性指导',
              effects: {
                coachTrust: 3,
                fatigue: 2,
                confidence: 2,
              },
              response:
                '你完成了额外复盘，开始理解教练反复强调的细节，但还没有在高速对抗里完全执行。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“方向清楚了，下一次把它带到真正的对抗里。”',
                },
              ],
              followUp: '教练会继续给你小任务，完成情况将影响后续信任。',
            },
            failure: {
              label: '指导压力超过准备',
              effects: {
                coachTrust: -2,
                fatigue: 5,
                confidence: -1,
              },
              response:
                '你接受了更多任务，却没有安排恢复，额外训练让动作质量下降，指导反而变成了新的压力。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“主动性值得肯定，但承担责任也包括知道自己的上限。”',
                },
              ],
              followUp: '下一阶段会缩短额外任务，先确认你能在正常负荷下稳定执行。',
            },
          },
        },
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
        effects: {
          coachTrust: 2,
          confidence: 1,
        },
        resolution: {
          attribute: 'decision',
          difficulty: 50,
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
              label: '目标明确带来进步',
              effects: {
                coachTrust: 3,
                confidence: 2,
              },
              response:
                '你追问训练标准，拿到一个每天可对照的第一脚处理目标，并在当天完成了清晰的复盘记录。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“问题问得具体，训练才有可能回答得具体。”',
                },
              ],
              followUp: '教练会按这个目标安排阶段任务，进步和不足都会被记录。',
            },
            partial: {
              label: '专项目标初步建立',
              effects: {
                coachTrust: 2,
                confidence: 1,
              },
              response: '你弄清了训练重点，也开始对照目标练习，但动作质量还会随疲劳波动。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“目标已经清楚，接下来要让它经得住疲劳。”',
                },
              ],
              followUp: '下一次训练会在压力下复查第一脚处理质量。',
            },
            failure: {
              label: '要求仍然模糊',
              effects: {
                coachTrust: -1,
                confidence: -1,
              },
              response:
                '你得到了一份目标，却没有继续确认执行标准，训练中仍回到宽泛的“再努力一点”。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“不明白就继续问，模糊的目标不会自己变成能力。”',
                },
              ],
              followUp: '教练会先给你一个最小任务，确认你能按标准完成后再增加复杂度。',
            },
          },
        },
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
        effects: {
          coachTrust: 3,
          confidence: 2,
          fatigue: 3,
        },
        resolution: {
          attribute: 'discipline',
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
              label: '稳定完成信任考核',
              effects: {
                coachTrust: 4,
                confidence: 3,
                fatigue: 3,
              },
              response:
                '你按要求完成任务，没有急着炫技，几次疲劳下的基础处理仍然稳定，教练在记录旁边留下了肯定。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“稳定不是保守，是你在压力下仍能完成要求。”',
                },
              ],
              followUp: '下一阶段会把更复杂的训练责任交给你。',
            },
            partial: {
              label: '信任继续观察',
              effects: {
                coachTrust: 3,
                confidence: 2,
                fatigue: 3,
              },
              response:
                '你完成了大部分任务，基础要求没有失守，但几次节奏变化仍让动作质量出现波动。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“任务完成了，下一步是让变化也不影响基本质量。”',
                },
              ],
              followUp: '教练会继续观察你在比赛速度下能否保持可靠。',
            },
            failure: {
              label: '信任考核失分',
              effects: {
                coachTrust: -2,
                confidence: -2,
                fatigue: 5,
              },
              response:
                '你急着完成额外要求，忽略了基础动作，训练节奏被几次失误打断，教练暂时收回了更大的自由度。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“主动性不能替代执行，先把要求本身做好。”',
                },
              ],
              followUp: '下一次训练会回到基础任务，重新确认你能否稳定完成。',
            },
          },
        },
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
        effects: {
          coachTrust: 1,
          confidence: 4,
          fatigue: 6,
        },
        resolution: {
          attribute: 'decision',
          difficulty: 65,
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
              label: '创造性得到边界',
              effects: {
                coachTrust: 2,
                confidence: 5,
                fatigue: 6,
              },
              response:
                '你完成基础任务后只在可控回合里加大难度，几次变化制造了亮点，却没有打乱训练节奏。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“创造性有价值，但你已经学会给它加上边界。”',
                },
              ],
              followUp: '教练会逐步开放更复杂的任务，前提是基础失误继续下降。',
            },
            partial: {
              label: '冒险留下亮点',
              effects: {
                coachTrust: 1,
                confidence: 4,
                fatigue: 6,
              },
              response:
                '你主动加大难度，几次处理很有想法，也有几次让训练被迫停下，结果仍在观察中。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“敢尝试是优点，接下来要让失误率跟着降下来。”',
                },
              ],
              followUp: '下一次会保留你的自由度，但先限制高风险动作的频率。',
            },
            failure: {
              label: '自由度暂时收回',
              effects: {
                coachTrust: -2,
                confidence: -1,
                fatigue: 8,
              },
              response:
                '你把尚未练稳的变化连续带进正式任务，训练节奏被打断，教练要求你回到基础执行。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“想承担更多责任，先证明基础动作值得别人跟随。”',
                },
              ],
              followUp: '后续训练会降低难度，等稳定性恢复后再重新开放尝试。',
            },
          },
        },
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
        effects: {
          coachTrust: 4,
          confidence: 2,
        },
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
        effects: {
          coachTrust: 2,
          confidence: 4,
          fatigue: 3,
        },
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
        effects: {
          fatigue: -3,
          morale: 2,
        },
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
