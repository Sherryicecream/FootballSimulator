// 由既有 TS 内容源一次性生成（M11 模块 3 内容外置）；编辑后经 zod 校验生效。
import type { EventDefinition } from '@football/contracts';

export const youthCoreEvents: EventDefinition[] = [
  {
    id: 'misunderstanding-clarification',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 22,
    title: '训练场上的误会',
    description:
      '一次训练中的沟通失误让你和队友都感到不舒服。教练没有急着下结论，而是把处理问题的主动权交给了你。',
    condition: {
      requirePersonRole: 'teammate',
      requireFactType: 'training',
    },
    participantRoles: ['youth-coach', 'teammate'],
    storyId: 'misunderstanding-opened',
    nextEvents: ['misunderstanding-repair'],
    cooldownWeeks: 18,
    choices: [
      {
        id: 'clarify',
        text: '当面澄清误会，把训练中的情况说清楚',
        riskLabel: 'medium',
        effects: {
          respect: 3,
          trust: 2,
          confidence: 2,
        },
        resolution: {
          attribute: 'decision',
          difficulty: 58,
          volatility: 7,
          stateModifiers: {
            morale: 0,
            form: 0,
            confidence: 0.2,
            fitness: 0,
            fatigue: -0.1,
            coachTrust: 0.15,
          },
          outcomes: {
            success: {
              label: '沟通奏效',
              effects: {
                respect: 4,
                trust: 3,
                confidence: 3,
                coachTrust: 2,
              },
              response:
                '你把事实、感受和下一次配合分开说清楚，教练没有再追问，队友也主动把误会放下。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“愿意把问题说开，才有机会把注意力带回训练。”',
                },
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“我刚才确实听反了，下一次我会提前喊你。”',
                },
              ],
              followUp: '教练会把这次沟通记在心里；下一场比赛，你们的默契会成为新的观察点。',
            },
            partial: {
              label: '误会缓和',
              effects: {
                respect: 2,
                trust: 1,
                confidence: 1,
              },
              response: '你的解释让气氛缓和下来，但队友仍需要几次训练确认你们能否真正配合。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“方向是对的，先让下一次配合证明它。”',
                },
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“我愿意再试一次，但我们要把信号说清楚。”',
                },
              ],
              followUp: '下一场比赛的第一次沟通将决定这次澄清能否留下来。',
            },
            failure: {
              label: '解释被误解',
              effects: {
                respect: -1,
                trust: -2,
                confidence: -2,
                coachTrust: -2,
              },
              response: '你试图把话说清楚，却被听成了推责；教练让你们先回到训练，不再继续争辩。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“先停下争论，下一次训练用行动承担责任。”',
                },
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“我现在还没听懂你的意思，先别把问题扩大。”',
                },
              ],
              followUp: '下一次训练你需要用行动证明自己愿意承担沟通责任。',
            },
          },
        },
        response: '你把事情说清楚了，训练场的空气终于松动下来。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“愿意把问题说开，这是成熟的表现。”',
          },
          {
            speakerRole: 'teammate',
            text: '{personName}：“那我们别把误会带进下一场比赛。”',
          },
        ],
        followUp: '教练会在接下来两周观察你们的沟通，队友也愿意重新把你当作传球选择。',
        narrativeVariants: [
          {
            response: '你把事实和感受分开说清楚，训练场的空气终于松动下来。',
            responses: [
              {
                speakerRole: 'youth-coach',
                text: '{personName}：“愿意把问题说开，才有机会把注意力带回训练。”',
              },
              {
                speakerRole: 'teammate',
                text: '{personName}：“我刚才确实把你的意思听反了，下一次我会提前喊你。”',
              },
            ],
            followUp: '教练会观察你们能否把这次澄清变成下一场比赛里的主动沟通。',
          },
          {
            response: '你没有急着争辩，而是先承认自己的表达不够清楚，再把跑位细节重新讲了一遍。',
            responses: [
              {
                speakerRole: 'youth-coach',
                text: '{personName}：“把事实讲具体，比谁先赢下争论更重要。”',
              },
              {
                speakerRole: 'teammate',
                text: '{personName}：“那我们从下一脚传球开始重新配合。”',
              },
            ],
            followUp: '下一次训练会给你们一个重新建立默契的机会，队友也会留意你是否继续主动沟通。',
          },
        ],
      },
      {
        id: 'stay-quiet',
        text: '先保持沉默，用接下来的训练表现证明自己',
        riskLabel: 'low',
        effects: {
          confidence: 1,
          morale: -1,
        },
        resolution: {
          attribute: 'composure',
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
              label: '沉默换来稳定',
              effects: {
                confidence: 2,
              },
              response:
                '你没有争辩，却在训练中连续做对了几个关键选择，队友的戒心先被稳定表现压了下去。',
              responses: [
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“我看见你在认真补救，下一次我会先给你信号。”',
                },
              ],
              followUp: '教练会继续观察你能否把沉默转成稳定沟通，而不是再次回避问题。',
            },
            partial: {
              label: '问题暂时搁置',
              effects: {
                confidence: 1,
                morale: -1,
              },
              response: '你没有把争执继续扩大，但误会也没有真正消失。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“沉默可以让训练继续，但问题还在这里。”',
                },
              ],
              followUp: '下一次配合前，教练会留意你是否愿意主动说出跑位意图。',
            },
            failure: {
              label: '误会继续发酵',
              effects: {
                confidence: -2,
                morale: -2,
                trust: -1,
              },
              response:
                '你把话留到场下，却没能阻止情绪带进下一次对抗；一次迟到的传球让旧问题重新浮出水面。',
              responses: [
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“你一直不说，我只能按最坏的方式猜。”',
                },
              ],
              followUp: '下一次训练需要先修复沟通，再谈用表现证明自己。',
            },
          },
        },
        response: '你没有把争执继续扩大，但误会也没有真正消失。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“沉默可以让训练继续，但问题还在这里。”',
          },
          {
            speakerRole: 'teammate',
            text: '{personName}把话咽了回去，下一次配合时仍然多看了你一眼。',
          },
        ],
        followUp: '如果下一场比赛再次出现沟通失误，这段没有说开的情绪可能会重新浮现。',
      },
    ],
  },
  {
    id: 'misunderstanding-repair',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    theme: 'match',
    interaction: 'decision',
    baseWeight: 24,
    title: '误会后的第一次配合',
    description:
      '那次冲突之后，你和队友终于在比赛里再次站到同一侧。一次关键跑位即将验证，你们是否真的找到了解决方式。',
    condition: {
      requireStoryId: 'misunderstanding-opened',
      requireFactType: 'match',
      requirePersonRole: 'teammate',
    },
    participantRoles: ['youth-coach', 'teammate'],
    storyId: 'misunderstanding-repaired',
    cooldownWeeks: 14,
    choices: [
      {
        id: 'call-early',
        text: '提前沟通跑位，把话说在前面',
        riskLabel: 'low',
        effects: {
          trust: 2,
          respect: 2,
        },
        resolution: {
          attribute: 'decision',
          difficulty: 54,
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
              label: '默契重新接上',
              effects: {
                trust: 3,
                respect: 3,
              },
              response:
                '你在跑位前把意图说清楚，队友及时把球送进空当，第一次配合不漂亮却足够可靠。',
              responses: [
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“提前说一声，很多失误就不会发生。”',
                },
              ],
              followUp: '教练会在下一场比赛继续观察你们能否把主动沟通保持住。',
            },
            partial: {
              label: '配合暂时修复',
              effects: {
                trust: 2,
                respect: 2,
              },
              response: '你提前喊出了跑位，队友也做出回应；配合完成了，但节奏仍有半拍迟疑。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“方向是对的，下一步是让沟通赶在动作之前。”',
                },
              ],
              followUp: '接下来几次训练会继续检验这份默契能否经受更快的比赛节奏。',
            },
            failure: {
              label: '沟通再次错位',
              effects: {
                trust: -1,
                respect: -1,
                confidence: -1,
              },
              response:
                '你试着提前沟通，却在关键一刻说得含糊，队友按另一种理解启动，机会从两人的犹豫间溜走。',
              responses: [
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“我听见了，但还是不知道你到底要往哪里跑。”',
                },
              ],
              followUp: '下一场训练会先安排简单配合，重新建立可执行的信号。',
            },
          },
        },
        response:
          '你在跑位前先喊出了自己的意图，队友也用手势回应。那次配合并不华丽，却让你们第一次不用猜测彼此的下一步。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“沟通要发生在动作之前，这样失误才有机会变成配合。”',
          },
          {
            speakerRole: 'teammate',
            text: '{personName}：“你提前说一声，我就知道该把空间留给你。”',
          },
        ],
        followUp:
          '这次配合会成为你们重新建立默契的第一笔；接下来面对更快的比赛节奏，主动沟通仍会被继续检验。',
      },
      {
        id: 'play-through',
        text: '不再解释，直接用跑位回应',
        riskLabel: 'medium',
        effects: {
          respect: 1,
        },
        resolution: {
          attribute: 'offTheBall',
          difficulty: 56,
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
              label: '跑位回应奏效',
              effects: {
                respect: 2,
                confidence: 2,
              },
              response:
                '你连续两次提前启动，第二次终于在队友抬头前进入了空当；这次冒险让默契有了实际落点。',
              responses: [
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“这次我看懂了，你的启动比以前更早。”',
                },
              ],
              followUp: '教练会在下一场比赛安排相似回合，检验你能否稳定读懂空间。',
            },
            partial: {
              label: '表现暂时回应',
              effects: {
                respect: 1,
              },
              response:
                '你用跑位回应了质疑，队友完成了传球，但你们仍需要更多提示才能在压力下同步。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“表现能说明一部分问题，别让队友永远靠猜。”',
                },
              ],
              followUp: '下一次高压训练会继续观察你是否保留主动沟通。',
            },
            failure: {
              label: '跑位没有被读懂',
              effects: {
                respect: -1,
                confidence: -2,
              },
              response:
                '你连续启动却没有给出足够信号，队友错过了传球窗口，原本想用表现证明自己的计划反而制造了新的误解。',
              responses: [
                {
                  speakerRole: 'teammate',
                  text: '{personName}：“我没收到你的信号，只能把球回传。”',
                },
              ],
              followUp: '下一次合练会从明确喊话开始，先恢复基本配合再追求冒险。',
            },
          },
        },
        response:
          '你没有再停下来解释，而是提前启动、连续跑了两次空当。第二次队友终于把球送了过来，迟到的默契在一次冒险里重新接上。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“用表现回答可以，但别让队友每次都靠猜来理解你。”',
          },
          {
            speakerRole: 'teammate',
            text: '{personName}在回防时冲你点了点头：“这次我跟上了，下一次提前给我信号。”',
          },
        ],
        followUp:
          '你们的关系开始恢复，但稳定默契还没有形成；下一次高压回合里，少一次误解就会多一次机会。',
      },
    ],
  },
  {
    id: 'coach-praise',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '教练的表扬',
    description:
      '今天的训练结束后，教练单独把你叫到一边，对你的表现表示了肯定。"这段时间进步很大，继续保持。"教练说道。',
    condition: {},
    choices: [
      {
        id: 'cp-humble',
        text: '感谢教练，我会继续努力',
        riskLabel: 'low',
        effects: {
          morale: 5,
          coachTrust: 3,
        },
        memoryKey: 'coach-praise-humble',
        response:
          '你没有把表扬当成终点，而是认真记下教练提到的细节。教练收起记录本时，脸上的严肃终于松了一点。',
        followUp:
          '下一次训练教练会继续观察你是否保持今天的专注；稳定的回应比一次漂亮的表态更有分量。',
      },
      {
        id: 'cp-confident',
        text: '是的，我感觉自己越来越好了',
        riskLabel: 'low',
        effects: {
          morale: 3,
          coachTrust: 5,
        },
        memoryKey: 'coach-praise-confident',
        response:
          '你坦然承认自己正在进步，教练没有打断，只是在最后补了一句：“那就把这份感觉带到下一场对抗里。”',
        followUp:
          '教练会给你更明确的训练目标；信心能够转化成表现时，这次表扬才会真正改变你的定位。',
      },
    ],
    cooldownWeeks: 4,
    narrativeTemplate: '## {title}\n\n{description}',
  },
  {
    id: 'late-to-training',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '训练迟到',
    description:
      '今早你睡过了头，赶到训练场时大家已经开始热身了。教练皱着眉头看了你一眼，没有说话。',
    condition: {},
    choices: [
      {
        id: 'lt-apologize',
        text: '诚恳道歉，解释原因',
        riskLabel: 'low',
        effects: {
          coachTrust: -2,
          morale: -2,
        },
        response:
          '你先向全队道歉，再把迟到的原因说明白。教练没有当众训斥你，只让你补完热身后再加入分组。',
        followUp: '今天的信任受到了轻微影响；接下来几周准时到场，会比再次解释更快修复印象。',
      },
      {
        id: 'lt-quiet',
        text: '默默加入训练，用表现说话',
        riskLabel: 'medium',
        effects: {
          coachTrust: -5,
          morale: -1,
        },
        response:
          '你没有解释，直接跟上了队伍的节奏。训练里有几次不错的处理，却没能抹掉教练在签到表旁边留下的那道记号。',
        followUp: '教练会更严格地看待你的纪律；短期表现能减轻影响，但下一次迟到会让问题迅速放大。',
      },
    ],
    cooldownWeeks: 8,
  },
  {
    id: 'team-invite',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '队友的邀请',
    description: '训练结束后，几个队友商量着周末一起去吃火锅，他们热情地邀请你一起参加。',
    condition: {},
    choices: [
      {
        id: 'ti-go',
        text: '当然去，和大家增进感情',
        riskLabel: 'low',
        effects: {
          morale: 5,
          fatigue: 3,
        },
        memoryKey: 'team-bonding',
        response:
          '你答应了周末的火锅局，原本只在训练场说话的几个人开始聊起各自的家乡。笑声很多，回到宿舍时也确实比平时更累。',
        followUp: '更衣室里的熟悉感会让下一次配合更自然，但社交安排也会占用你的恢复时间。',
      },
      {
        id: 'ti-rest',
        text: '婉拒，周末想休息一下',
        riskLabel: 'low',
        effects: {
          morale: 1,
          fatigue: -3,
        },
        memoryKey: 'team-skipped',
        response:
          '你礼貌地拒绝了邀请，把周末留给睡眠和拉伸。队友没有介意，只是在群聊里多发了几张聚餐照片。',
        followUp:
          '身体会更快恢复，但你需要在下一次训练中主动加入谈话，避免把自己慢慢留在更衣室之外。',
      },
    ],
    cooldownWeeks: 6,
  },
  {
    id: 'minor-injury',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '轻微不适',
    description: '训练中你感到小腿有些酸痛，队医建议你休息几天，但最近正是竞争主力位置的关键时期。',
    condition: {
      requireActiveInjury: true,
    },
    participantRoles: ['youth-coach'],
    choices: [
      {
        id: 'mi-rest',
        text: '听从队医建议，休息恢复',
        riskLabel: 'low',
        effects: {
          fatigue: -10,
          coachTrust: -2,
          morale: -2,
        },
        response:
          '你接受了队医的安排，没有在竞争最紧张的时候硬撑。看着队友继续合练，你有些失落，但小腿的紧绷感正在减轻。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“缺席几次训练不可怕，把小问题拖成大伤才可怕。”',
          },
        ],
        followUp: '教练会暂时降低对你的出场期待；恢复顺利的话，健康的身体会给你重新竞争的位置。',
      },
      {
        id: 'mi-push',
        text: '坚持训练，不能掉队',
        riskLabel: 'high',
        effects: {
          fatigue: 10,
          coachTrust: 3,
          morale: 3,
        },
        response:
          '你咬牙完成了训练，几次拼抢甚至比平时更积极。结束后队医发现疼痛范围扩大，教练的表扬也没有让他放松警惕。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“勇敢不是忽略身体，明天先接受复查。”',
          },
        ],
        followUp:
          '你的态度赢得了教练的注意，但疲劳和疼痛可能压缩下一场的出场时间；身体状况会决定这次冒险的代价。',
      },
    ],
    cooldownWeeks: 10,
  },
  {
    id: 'competition-with-teammate',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '位置竞争',
    description:
      '队里来了一个新球员，和你踢同一个位置。教练在训练中让你们轮流上场，似乎正在考察谁更适合首发。',
    condition: {
      requirePersonRole: 'rival',
    },
    participantRoles: ['rival', 'youth-coach'],
    choices: [
      {
        id: 'cw-train-harder',
        text: '加练，用实力证明自己',
        riskLabel: 'medium',
        effects: {
          fatigue: 8,
          coachTrust: 4,
          morale: 3,
        },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}看完你的加练，只说：“那就把今天的强度带到正式对抗里。”',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“竞争看的是持续表现，不是一晚上的热血。”',
          },
        ],
        response:
          '你把额外时间花在了最薄弱的环节上，动作质量确实提高了一点。新队友没有退让，反而在旁边把同一组练习也做完。',
        followUp:
          '教练会在下一轮分组对抗中比较你们的稳定性；加练带来的疲劳也可能影响你当日的细节。',
      },
      {
        id: 'cw-observed',
        text: '先观察对手的特点，再调整策略',
        riskLabel: 'low',
        effects: {
          morale: 2,
          coachTrust: 1,
        },
        responses: [
          {
            speakerRole: 'rival',
            text: '{personName}注意到你在观察他的习惯，下一次对抗时刻意改变了启动方式。',
          },
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“看懂对手只是第一步，还要把观察变成自己的选择。”',
          },
        ],
        response:
          '你没有急着用更大的训练量回应，而是记下了竞争者的启动习惯和处理球节奏。新的角度让你少了些焦躁。',
        followUp:
          '下一次对抗会检验你的观察是否真正有用；如果能提前占据有利位置，竞争就不只靠身体对抗。',
      },
    ],
    cooldownWeeks: 12,
  },
  {
    id: 'family-support',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '家人的鼓励',
    description: '父母打电话来关心你的训练和生活，叮嘱你注意身体，说他们为你感到骄傲。',
    condition: {
      requirePersonRole: 'family',
    },
    participantRoles: ['family'],
    choices: [
      {
        id: 'fs-touched',
        text: '心里暖暖的，更加坚定',
        riskLabel: 'low',
        effects: {
          morale: 6,
        },
        responses: [
          {
            speakerRole: 'family',
            text: '{personName}：“踢得好不好都要好好吃饭，别只报喜不报忧。”',
          },
        ],
        response:
          '电话那头没有复杂的建议，只是熟悉的声音让你在训练基地重新找到了一点踏实感。你挂断电话后，把明天的训练目标重新写了一遍。',
        followUp: '家人的支持会成为低谷时的缓冲，但训练中的具体问题仍需要你自己在场上解决。',
      },
      {
        id: 'fs-focused',
        text: '简短回应，继续专注于训练',
        riskLabel: 'low',
        effects: {
          morale: 2,
          coachTrust: 1,
        },
        responses: [
          {
            speakerRole: 'family',
            text: '{personName}：“知道你忙，训练结束记得回个消息就好。”',
          },
        ],
        response:
          '你没有让电话打乱训练计划，只在结束前告诉家人自己一切顺利。对方虽然有些失望，还是把担心藏回了语气里。',
        followUp: '你保住了训练专注度，也需要记得关系不会只靠一句“我没事”维持。',
      },
    ],
    cooldownWeeks: 6,
  },
  {
    id: 'quiet-week-reflection',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '平淡的一周',
    description:
      '这一周没有特别的事情发生，训练按部就班，生活平静如水。你利用这段时间反思了自己的进步和不足。',
    condition: {},
    choices: [
      {
        id: 'qw-self-improve',
        text: '制定新的训练计划',
        riskLabel: 'low',
        effects: {
          morale: 2,
          fatigue: 2,
        },
        response:
          '你把本周的训练记录摊开，给下一阶段写下了三个可以检查的小目标。计划没有让你立刻变强，却让平淡的日子有了方向。',
        followUp:
          '下个月的训练报告会告诉你哪些目标真正完成；如果计划过满，也要学会及时删掉不现实的部分。',
      },
      {
        id: 'qw-rest',
        text: '好好休息，为下一周充电',
        riskLabel: 'low',
        effects: {
          fatigue: -5,
          morale: 1,
        },
        response:
          '你没有给安静的一周强行安排一场证明自己的戏，而是认真睡足、拉伸，给身体留出恢复空间。',
        followUp: '下一周你会用更好的体能重新开始；休息只有在回到训练时转化成专注，才不是逃避。',
      },
    ],
    cooldownWeeks: 3,
  },
  {
    id: 'extra-training',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '额外加练',
    description:
      '今天的常规训练结束后，球场还有几个人在加练。你感觉今天的状态不错，留下来加练一会儿可能会有所收获。',
    condition: {},
    choices: [
      {
        id: 'et-stay',
        text: '留下来加练一小时',
        riskLabel: 'low',
        effects: {
          fatigue: 5,
          coachTrust: 2,
          morale: 2,
        },
        response:
          '你留下来把最后几组动作做完，空场里的每一次触球都听得很清楚。教练路过时没有打扰，只在训练记录上多写了一行。',
        followUp:
          '加练会增加教练对你投入度的印象，但如果恢复跟不上，额外训练也可能反过来削弱比赛状态。',
      },
      {
        id: 'et-rest',
        text: '回去休息，明天还有训练',
        riskLabel: 'low',
        effects: {
          fatigue: -3,
          morale: 1,
        },
        response:
          '你收好球鞋离开球场，把今天的训练停在一个还算舒服的节点。第二天早晨醒来时，腿部没有想象中那么沉。',
        followUp:
          '合理恢复会让你在连续训练中保持质量；教练也会观察你是否能把休息变成更稳定的表现。',
      },
    ],
    cooldownWeeks: 5,
  },
  {
    id: 'debut-chance',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '首秀机会',
    description:
      '教练在赛前找到你："这场比赛的对手实力不强，我打算让你下半场替补出场。准备好了吗？"你的心跳加速，这是你期盼已久的机会。',
    condition: {},
    choices: [
      {
        id: 'dc-ready',
        text: '准备好了！一定全力以赴',
        riskLabel: 'medium',
        effects: {
          morale: 8,
          coachTrust: 5,
        },
        memoryKey: 'debut-confident',
        response:
          '你回答得很快，随后把替补席上的热身路线又走了一遍。等待上场的时间比训练更难熬，但你的注意力始终跟着比赛。',
        followUp:
          '教练已经把你视为可用的替补人选；首秀时机还要看比赛走势，你需要准备好立即进入节奏。',
      },
      {
        id: 'dc-nervous',
        text: '有点紧张，但我会尽力',
        riskLabel: 'low',
        effects: {
          morale: 3,
          coachTrust: 2,
        },
        memoryKey: 'debut-nervous',
        response:
          '你承认自己紧张，教练没有笑你，只让你先把最简单的接球和回防做好。说出紧张之后，心跳反而慢了一点。',
        followUp:
          '如果获得登场机会，教练会先要求你执行基础任务；稳定完成第一步，比急着证明自己更重要。',
      },
    ],
    cooldownWeeks: 10,
  },
  {
    id: 'locker-room-conflict',
    version: 1,
    category: 'dressing-room',
    rarity: 'uncommon',
    title: '更衣室里的争执',
    description:
      '训练结束后，两名队友在更衣室里因为一次训练中的拼抢发生了激烈的争吵。气氛很紧张，其他人都不知道该说什么。',
    condition: {},
    choices: [
      {
        id: 'lc-mediate',
        text: '上前劝架，缓和气氛',
        riskLabel: 'medium',
        effects: {
          morale: 3,
          coachTrust: 2,
        },
        memoryKey: 'conflict-mediated',
        response:
          '你站到两人中间，把争执从“谁先犯规”拉回到那次拼抢本身。声音慢慢低下来，更衣室终于重新有了换衣服的动静。',
        followUp:
          '队友会记住你愿意处理麻烦的一面；但真正的关系修复仍需要他们在下一次对抗中自己说开。',
      },
      {
        id: 'lc-stay-out',
        text: '不关我的事，默默离开',
        riskLabel: 'low',
        effects: {
          morale: -1,
        },
        memoryKey: 'conflict-stayed-out',
        response:
          '你拿起背包离开了更衣室，把争执留给当事人。没有人因此责怪你，但走廊里传来的沉默让这次训练显得格外漫长。',
        followUp:
          '你避免了被卷入冲突，也失去了一次建立更衣室信任的机会；之后的训练气氛仍可能受到影响。',
      },
    ],
    cooldownWeeks: 10,
  },
  {
    id: 'social-vs-rest',
    version: 1,
    category: 'off-pitch',
    rarity: 'common',
    title: '周末的安排',
    description: '周末到了，队友们约好一起去唱卡拉OK，但你最近感觉有点累，也想好好休息一下。',
    condition: {},
    choices: [
      {
        id: 'sr-social',
        text: '和队友们出去玩，增进感情',
        riskLabel: 'low',
        effects: {
          morale: 4,
          fatigue: 4,
        },
        response:
          '你加入了队友的周末安排，训练场之外的玩笑让几个人的距离近了不少。回程时大家都在说下一场怎么配合。',
        followUp:
          '更好的熟悉感可能转化成比赛中的默契，但额外社交会消耗恢复时间，下一次训练要留意身体信号。',
      },
      {
        id: 'sr-rest',
        text: '在家休息，恢复体力',
        riskLabel: 'low',
        effects: {
          fatigue: -5,
          morale: 1,
        },
        response:
          '你关掉消息提醒，把周末交给睡眠、拉伸和一顿好好吃完的饭。没有热闹的故事发生，但周一的双腿轻了不少。',
        followUp: '恢复会提高你应对下一周训练的余量；和队友的关系则需要在平日里用稳定的配合维持。',
      },
    ],
    cooldownWeeks: 5,
  },
  {
    id: 'fitness-test',
    version: 1,
    category: 'china-youth',
    rarity: 'common',
    title: '体能测试',
    description:
      '今天队里安排了每月一次的体能测试——12分钟跑。教练会记录每个人的成绩，成绩好的球员在接下来的训练中会得到更多关注。',
    condition: {},
    choices: [
      {
        id: 'ft-go-hard',
        text: '全力冲刺，争取最好成绩',
        riskLabel: 'medium',
        effects: {
          fitness: 5,
          fatigue: 8,
          coachTrust: 3,
          morale: 2,
        },
        response:
          '你在最后几分钟把速度推到极限，冲线时几乎站不稳。成绩排进了队内前列，教练也注意到你愿意在疲劳下坚持。',
        followUp: '更高的体能评价会带来训练机会，但短期疲劳会增加；下一次比赛前必须把恢复补回来。',
      },
      {
        id: 'ft-pace',
        text: '按自己的节奏跑，安全第一',
        riskLabel: 'low',
        effects: {
          fitness: 2,
          fatigue: 3,
          morale: 1,
        },
        response:
          '你没有被旁边的冲刺带乱节奏，按计划完成了测试。成绩不算最亮眼，却从头到尾保持了可控的呼吸。',
        followUp:
          '教练会把稳定性纳入评价；如果想提高排名，下一次需要在保持节奏的基础上逐步提高上限。',
      },
    ],
    cooldownWeeks: 8,
  },
  {
    id: 'confidence-crisis',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '信心危机',
    description:
      '最近几场训练中你频频出现失误，队友开始有些不耐烦了。你开始怀疑自己是否真的适合踢球，晚上躺在床上辗转难眠。',
    condition: {},
    participantRoles: ['youth-coach'],
    choices: [
      {
        id: 'cc-push-through',
        text: '加倍努力，用汗水克服困难',
        riskLabel: 'medium',
        effects: {
          morale: -3,
          fatigue: 8,
          coachTrust: 3,
        },
        memoryKey: 'crisis-pushed-through',
        response:
          '你把训练量往上推，却发现疲劳让动作越来越僵。努力没有立刻带来掌声，但你至少重新找回了一点“我还在坚持”的感觉。',
        followUp:
          '教练会认可你的投入，同时关注疲劳是否继续堆积；如果只靠加量，信心危机可能换一种方式回来。',
      },
      {
        id: 'cc-talk',
        text: '找教练谈心，寻求指导',
        riskLabel: 'low',
        effects: {
          morale: 2,
          fatigue: 2,
          coachTrust: 4,
        },
        memoryKey: 'crisis-sought-guidance',
        response:
          '你把连续失误和对上场的担心说给教练听。谈话没有让问题消失，但你拿到了一份更小、更具体的训练任务。',
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“先把下一脚传对，信心会从这些小事里回来。”',
          },
        ],
        followUp:
          '接下来训练会围绕可完成的小目标展开；你会被要求重新主动要球，而不是等待状态自己出现。',
      },
    ],
    cooldownWeeks: 10,
  },
  {
    id: 'media-attention',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    title: '媒体的关注',
    description:
      '你在上一场比赛中的出色表现引起了本地媒体的注意。一名记者来到训练基地，想要采访你——这是你第一次面对镜头。',
    condition: {
      minReputation: 10,
      requireFactType: 'match',
      requireFactText: '突出表现',
    },
    participantRoles: ['youth-coach'],
    choices: [
      {
        id: 'ma-accept',
        text: '接受采访，自信表达',
        riskLabel: 'medium',
        effects: {
          morale: 5,
          coachTrust: 1,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“面对镜头可以自信，但训练场上的标准不会因为报道降低。”',
          },
        ],
        response:
          '你面对镜头谈了自己的训练习惯，也承认还有很多地方不够成熟。采访发布后，基地里多了几双关注你的眼睛。',
        followUp: '声望可能上升，也会带来更高期待；下一场训练的普通失误都可能被放大看待。',
      },
      {
        id: 'ma-decline',
        text: '婉拒采访，专注于训练',
        riskLabel: 'low',
        effects: {
          morale: 1,
          coachTrust: 3,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“知道什么时候把注意力留给训练，也是一种职业感。”',
          },
        ],
        response:
          '你礼貌地谢绝了采访，把那段时间用来完成额外的恢复和触球。记者离开时没有失望，只说以后仍会关注你的表现。',
        followUp:
          '你暂时避开了舆论压力，但如果未来想获得更大关注，仍需要用比赛表现主动把故事讲出来。',
      },
    ],
    cooldownWeeks: 15,
  },
  {
    id: 'scout-watching',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    title: '球探在看你',
    description:
      '今天的训练场上来了几张陌生的面孔——听队友说，那是来自其他俱乐部青年队的球探。他们在场边认真记录着每个球员的表现。',
    condition: {
      minReputation: 15,
    },
    choices: [
      {
        id: 'sw-show-off',
        text: '尽情展示自己，冒点险也值得',
        riskLabel: 'high',
        effects: {
          morale: 5,
          coachTrust: 2,
          fatigue: 5,
        },
        response:
          '你在球探面前尝试了几次平时不敢用的处理，成功时全场都看见了，失误时也同样明显。训练结束后，陌生人收起了记录本。',
        followUp:
          '球探可能记住你的上限，也会记住你的冒险成本；下一次展示需要证明今天的亮点不是偶然。',
      },
      {
        id: 'sw-normal',
        text: '保持平常心，正常发挥',
        riskLabel: 'low',
        effects: {
          morale: 2,
          coachTrust: 1,
        },
        response:
          '你没有为了看台边的陌生面孔改变踢法，仍然按平时的节奏完成训练。球探没有特别表态，但在你做出几次正确选择时抬头看了很久。',
        followUp:
          '稳定性会让外部关注更可信；如果球探继续跟踪，你需要在不同强度下保持同样的基本功。',
      },
    ],
    cooldownWeeks: 15,
  },
  {
    id: 'trial-invitation',
    version: 1,
    category: 'china-youth',
    rarity: 'legendary',
    title: '试训邀请',
    description:
      '你的表现引起了一家知名俱乐部青训营的注意！他们发来了一份为期一周的试训邀请函。如果表现出色，有可能被正式录取。这是一个改变命运的机会。',
    condition: {
      minReputation: 25,
    },
    choices: [
      {
        id: 'ti-go',
        text: '接受邀请，去更高平台挑战',
        riskLabel: 'high',
        effects: {
          morale: 10,
          coachTrust: 5,
          fatigue: 5,
        },
        response:
          '你接受了试训邀请，第一次走进更高水平的训练场。节奏比熟悉的环境更快，但你没有把陌生感当成退缩的理由。',
        followUp:
          '试训结果取决于连续几天的表现；这次经历也会让当前教练重新评估你面对更高强度的准备程度。',
      },
      {
        id: 'ti-stay',
        text: '婉拒，留在当前俱乐部继续磨练',
        riskLabel: 'low',
        effects: {
          morale: 3,
          coachTrust: 5,
        },
        response:
          '你谢绝了邀请，选择把尚未稳定的能力留在熟悉的环境里继续打磨。机会离开得很快，但教练对你的决定明显更放心。',
        followUp: '留队会给你更多纠正细节的时间；下一次机会到来时，别人会期待看到你已经准备充分。',
      },
    ],
    cooldownWeeks: 20,
  },
  {
    id: 'relocation-homesickness',
    version: 1,
    category: 'off-pitch',
    rarity: 'uncommon',
    title: '异地生活的夜晚',
    description: '离家训练的第三个月，你开始想念熟悉的饭菜和家人的声音。',
    condition: {
      requireRelocation: true,
      requirePersonRole: 'family',
    },
    participantRoles: ['family'],
    choices: [
      {
        id: 'rh-call-home',
        text: '给家里打电话',
        riskLabel: 'low',
        effects: {
          morale: 4,
          closeness: 3,
        },
        responses: [
          {
            speakerRole: 'family',
            text: '{personName}：“想家就说出来，这里永远有你的饭和灯。”',
          },
        ],
        response:
          '你把最近不习惯的地方一件件说出来，电话那头没有催你坚强，只陪你聊到情绪慢慢平下来。',
        followUp: '与家人的联系会成为异地生活的稳定支点；下一次低谷时，你也更容易主动求助。',
      },
      {
        id: 'rh-adapt',
        text: '整理房间并适应新生活',
        riskLabel: 'medium',
        effects: {
          confidence: 3,
          morale: -1,
        },
        responses: [
          {
            speakerRole: 'family',
            text: '{personName}收到你的房间照片后笑了：“先把自己的小地方安顿好，训练也会慢慢顺起来。”',
          },
        ],
        response:
          '你没有拨出电话，而是把杂乱的房间和第二天的训练用品重新整理好。熟悉感还没回来，但生活开始有了自己的秩序。',
        followUp:
          '适应需要时间；规律的生活会帮助你稳定状态，但家人的距离仍会在重要时刻被重新感受到。',
      },
    ],
    cooldownWeeks: 12,
  },
  {
    id: 'academy-school-balance',
    version: 1,
    category: 'off-pitch',
    rarity: 'uncommon',
    title: '训练与学业',
    description: '连续客场让课程落下了一些，老师希望你补上本月的学习计划。',
    condition: {
      requireFactType: 'match',
    },
    choices: [
      {
        id: 'as-plan',
        text: '和助教制定补课计划',
        riskLabel: 'low',
        effects: {
          fatigue: 2,
          confidence: 2,
        },
        response:
          '你把缺掉的课程列出来，和助教一起把补课安排塞进训练日程。时间变得更紧，但至少不再靠临时熬夜补洞。',
        followUp:
          '之后还会遇到比赛和课程冲突；这次计划能否执行，会影响教练组对你自我管理能力的判断。',
      },
      {
        id: 'as-delay',
        text: '先专注下一场比赛',
        riskLabel: 'medium',
        effects: {
          fatigue: -2,
          morale: -2,
        },
        response:
          '你把有限的精力留给了下一场比赛，赛前准备因此更完整。比赛结束后，未完成的课程仍然安静地等在书桌上。',
        followUp:
          '短期竞技状态得到保护，但补课压力会延后累积；下一次取舍时，你需要面对更少的缓冲时间。',
      },
    ],
    cooldownWeeks: 14,
  },
  {
    id: 'idol-message',
    version: 1,
    category: 'off-pitch',
    rarity: 'rare',
    title: '偶像的寄语',
    description: '一位你长期关注的职业球员为青训营录制视频，并点评了年轻球员的坚持。',
    condition: {
      requireFactType: 'monthly-settlement',
      minReputation: 10,
    },
    choices: [
      {
        id: 'im-learn',
        text: '记录他的训练建议',
        riskLabel: 'low',
        effects: {
          confidence: 4,
          morale: 3,
        },
        response:
          '你没有只记下偶像说过的漂亮话，而是把能在自己训练里尝试的步骤逐条写下。笔记最后多了一行：先验证，再崇拜。',
        followUp:
          '新的方法会在接下来训练中接受检验；真正留下来的不会是偶像的名字，而是适合你身体和位置的习惯。',
      },
      {
        id: 'im-own-way',
        text: '把鼓励化为自己的风格',
        riskLabel: 'low',
        effects: {
          confidence: 5,
        },
        response:
          '你听完寄语后没有照抄偶像的踢法，而是回想自己最擅长的处理方式。那段鼓励变成了更明确的自我判断。',
        followUp:
          '教练会在训练中观察你的风格是否更清晰；自信不是模仿别人，而是知道什么时候坚持自己的选择。',
      },
    ],
    cooldownWeeks: 20,
  },
  {
    id: 'upset-aftermath',
    version: 1,
    category: 'dressing-room',
    rarity: 'rare',
    title: '爆冷之后',
    description: '击败公认更强的对手后，更衣室很兴奋，教练提醒大家别被一场胜利冲昏头脑。',
    condition: {
      requireFactType: 'match',
      requireFactText: '爆冷',
    },
    participantRoles: ['youth-coach', 'teammate'],
    choices: [
      {
        id: 'ua-grounded',
        text: '和队友复盘比赛细节',
        riskLabel: 'low',
        effects: {
          respect: 3,
          confidence: 2,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“赢球值得高兴，但能把细节讲明白，才说明你们真的成长了。”',
          },
          {
            speakerRole: 'teammate',
            text: '{personName}：“下次我会更早喊你，那个空当其实还能打得更快。”',
          },
        ],
        response:
          '你和队友把爆冷的兴奋放到一边，重新看了几次关键回合。复盘结束时，你们发现胜利里仍藏着几个差点被忽略的漏洞。',
        followUp: '教练会在下一场安排相似的压力场景；把偶然的胜利变成稳定能力，需要你们继续沟通。',
      },
      {
        id: 'ua-celebrate',
        text: '尽情庆祝这场胜利',
        riskLabel: 'medium',
        effects: {
          morale: 6,
          fatigue: 3,
          closeness: 2,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“今晚可以庆祝，明早还是按时训练。”',
          },
          {
            speakerRole: 'teammate',
            text: '{personName}：“这次我们一起扛住了，下一场也别松。”',
          },
        ],
        response:
          '你和队友把更衣室的音乐开到最大，第一次真正感到自己属于这支队伍。笑声散去后，疲劳也比平时更明显。',
        followUp:
          '团队亲近感会上升，但教练会很快把注意力拉回下一场比赛；庆祝后的恢复将影响你们能否延续状态。',
      },
    ],
    cooldownWeeks: 18,
  },
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
        effects: {
          confidence: 3,
          fatigue: 2,
          coachTrust: 2,
        },
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
        effects: {
          confidence: 5,
          fatigue: 5,
          coachTrust: 1,
        },
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
    condition: {
      requireFactType: 'match',
      playerRoles: ['fringe', 'rotation', 'regular'],
    },
    cooldownWeeks: 8,
    choices: [
      {
        id: 'step-in',
        text: '迅速热身，随时准备登场',
        riskLabel: 'low',
        effects: {
          morale: 2,
          form: 2,
          fatigue: 2,
        },
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
    condition: {
      requireFactType: 'match',
      maxConfidence: 55,
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'review',
        text: '冷静复盘全部失球录像',
        riskLabel: 'low',
        effects: {
          confidence: 2,
          coachTrust: 3,
        },
        resolution: {
          attribute: 'composure',
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
              label: '复盘找到改口',
              effects: {
                confidence: 3,
                coachTrust: 3,
              },
              response:
                '你把失球录像按站位、回追和最后一脚传球拆开，终于找到一个能在下次提前修正的瞬间。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“问题被拆成动作，才有机会在比赛里真正改掉。”',
                },
              ],
              followUp: '下一场训练会安排同一侧的防守回合，检验你的第一步选择。',
            },
            partial: {
              label: '复盘形成方向',
              effects: {
                confidence: 2,
                coachTrust: 3,
              },
              response:
                '你完整看完了录像，也记下了主要失误；不过真正进入高速对抗时，修正还需要继续练。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“知道问题在哪里了，接下来要让身体记住新的选择。”',
                },
              ],
              followUp: '下一场比赛前会再回看一次关键回合，确认修正没有停在纸面上。',
            },
            failure: {
              label: '失误仍未拆开',
              effects: {
                confidence: -2,
                coachTrust: -2,
              },
              response:
                '你看完了录像，却始终把失球归结为运气和队友位置，第二天训练时仍重复了同一个回追错误。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“复盘不是找借口，下一次我要看到你指出自己的责任。”',
                },
              ],
              followUp: '接下来的训练会从最基础的站位开始，重新建立可靠的防守判断。',
            },
          },
        },
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
        effects: {
          morale: 2,
          confidence: -1,
        },
        resolution: {
          attribute: 'determination',
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
              label: '向前看但记住细节',
              effects: {
                morale: 3,
                confidence: 1,
              },
              response:
                '你关掉录像让自己休息，却在第二天主动记下那脚传球的触发条件；情绪放下了，教训没有丢。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“能继续向前，也能记住细节，这才是成熟的复盘。”',
                },
              ],
              followUp: '下一场比赛会给你一次重新处理相似局面的机会。',
            },
            partial: {
              label: '失误暂时放下',
              effects: {
                morale: 2,
                confidence: -1,
              },
              response:
                '你没有让失误继续占据整晚，第二天精神状态好了一些，但还没有把问题转成明确的训练目标。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“恢复状态是第一步，别让下一次机会又变成同一个画面。”',
                },
              ],
              followUp: '教练会在下一次训练提醒你回到录像里的关键区域。',
            },
            failure: {
              label: '失误被带进下一场',
              effects: {
                morale: -2,
                confidence: -3,
                coachTrust: -1,
              },
              response:
                '你急着翻篇，却在训练中回避同一侧的处理球；没有复盘的轻松很快变成了新的犹豫。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“向前看不等于假装没发生，先把该看的回合看完。”',
                },
              ],
              followUp: '下一场比赛前你需要完成一次针对性复盘，否则上场机会会受到影响。',
            },
          },
        },
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
    condition: {
      personalityTendencies: ['disciplined', 'composed', 'ambitious'],
    },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 8,
    choices: [
      {
        id: 'repeat',
        text: '按计划完成全部弱侧练习',
        riskLabel: 'low',
        effects: {
          confidence: 2,
          fatigue: 3,
        },
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
        effects: {
          confidence: 3,
          fatigue: 5,
        },
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
    condition: {
      maxConfidence: 58,
      requireFactType: 'training',
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'adjust',
        text: '和教练调整训练的重点',
        riskLabel: 'low',
        effects: {
          confidence: 2,
          coachTrust: 2,
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
              label: '训练重点重新对焦',
              effects: {
                confidence: 3,
                coachTrust: 3,
              },
              response:
                '你和教练把瓶颈拆成第一脚处理、抬头观察和最后选择三个小任务，训练终于有了可见的进度条。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“换的不是花样，是让每一次练习都能回答一个问题。”',
                },
              ],
              followUp: '接下来两周会记录这三个细节，短期数据不漂亮也不会被忽略。',
            },
            partial: {
              label: '瓶颈出现突破口',
              effects: {
                confidence: 2,
                coachTrust: 2,
              },
              response:
                '新的训练重点让你找到了方向，动作仍不够稳定，但每组练习都有了可以检查的目标。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“方向已经清楚，下一步是把它重复到比赛速度。”',
                },
              ],
              followUp: '下一次有对抗训练会检验你能否保持新的处理顺序。',
            },
            failure: {
              label: '调整没有落地',
              effects: {
                confidence: -1,
                coachTrust: -1,
                fatigue: 2,
              },
              response:
                '你同意调整计划，却没有真正改变动作习惯；训练内容变了，关键回合里的选择仍旧原地打转。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“写下新计划不等于执行，先把一个细节做对。”',
                },
              ],
              followUp: '教练会缩小任务范围，直到你能在疲劳下完成最基本的修正。',
            },
          },
        },
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
        effects: {
          confidence: 1,
          fatigue: 4,
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
              label: '重复转成稳定',
              effects: {
                confidence: 2,
                fatigue: 2,
              },
              response:
                '你在最后几组仍保持动作质量，并主动修正每次触球的角度；枯燥的重复开始变成可复用的稳定。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“重复不是目的，能在疲劳里保持质量才是进步。”',
                },
              ],
              followUp: '下一次对抗训练会把这项稳定带进更快的节奏。',
            },
            partial: {
              label: '动作略有稳定',
              effects: {
                confidence: 1,
                fatigue: 4,
              },
              response:
                '你把同一组动作坚持到底，失误确实少了一点，但疲劳让动作质量还没有完全固定。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“基础已经有了，下一次要学会在累的时候保持它。”',
                },
              ],
              followUp: '接下来会继续观察重复训练是否真的转化为比赛处理球。',
            },
            failure: {
              label: '重复加重疲劳',
              effects: {
                confidence: -1,
                fatigue: 6,
              },
              response: '你把训练量一再推高，却没有修正动作，最后几组的失误和疲劳一起累积。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“加量不能替代修正，先把动作做对再谈坚持。”',
                },
              ],
              followUp: '下一次训练会降低总量，并检查疲劳是否已经影响你的基本技术。',
            },
          },
        },
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
    condition: {
      minFatigue: 60,
    },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 6,
    choices: [
      {
        id: 'recover',
        text: '配合理疗完成低强度恢复',
        riskLabel: 'low',
        effects: {
          fatigue: -6,
          fitness: 2,
        },
        resolution: {
          attribute: 'stamina',
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
              label: '恢复计划执行顺利',
              effects: {
                fatigue: -8,
                fitness: 3,
              },
              response:
                '你按理疗师安排完成低强度恢复，疲劳明显下降，身体对下一次训练的反馈也更稳定。',
              responses: [
                {
                  speakerRole: 'assistant-coach',
                  text: '{personName}：“恢复不是偷懒，是让下一次训练有质量地开始。”',
                },
              ],
              followUp: '助教会根据明天的疲劳反应决定是否逐步加回跑动量。',
            },
            partial: {
              label: '恢复达到预期',
              effects: {
                fatigue: -6,
                fitness: 2,
              },
              response: '你完成了恢复课程，疲劳得到缓解，但身体还没有准备好立刻回到完整对抗。',
              responses: [
                {
                  speakerRole: 'assistant-coach',
                  text: '{personName}：“今天的目标完成了，明天仍要先听身体的反馈。”',
                },
              ],
              followUp: '下一次训练会继续控制强度，避免恢复日变成新的负荷。',
            },
            failure: {
              label: '恢复效果有限',
              effects: {
                fatigue: -1,
                fitness: -1,
              },
              response:
                '你虽然完成了课程，却没有按要求补水和降下节奏，疲劳只小幅回落，身体仍显得沉重。',
              responses: [
                {
                  speakerRole: 'assistant-coach',
                  text: '{personName}：“恢复计划需要完整执行，不能只完成场上的一半。”',
                },
              ],
              followUp: '教练组会延长低强度阶段，并观察是否出现新的不适信号。',
            },
          },
        },
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
    condition: {
      requireFactType: 'match',
      requirePersonRole: 'youth-coach',
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 8,
    choices: [
      {
        id: 'listen',
        text: '认真接受教练的分析',
        riskLabel: 'low',
        effects: {
          coachTrust: 3,
          confidence: 2,
        },
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
        effects: {
          coachTrust: 1,
          confidence: 3,
        },
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
    condition: {
      requirePersonRole: 'teammate',
    },
    participantRoles: ['teammate'],
    cooldownWeeks: 8,
    choices: [
      {
        id: 'remember',
        text: '把建议记下来并加入恢复练习',
        riskLabel: 'low',
        effects: {
          confidence: 2,
          respect: 2,
        },
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
        effects: {
          closeness: 2,
          respect: 2,
        },
        response:
          '你在训练结束后把自己的意图说了出来，队友也承认他当时只看到了结果。两个人没有立刻变得亲密，但下一次传球前都多看了一眼。',
        responses: [
          {
            speakerRole: 'teammate',
            text: '{personName}：“下次我会先喊一声，别让你猜我的跑位。”',
          },
        ],
        followUp:
          '接下来的合练会检验这次沟通是否有效；一次更顺畅的配合，可能比口头道歉更快修复默契。',
      },
      {
        id: 'train',
        text: '用一次完美配合做出回应',
        riskLabel: 'medium',
        effects: {
          respect: 3,
          fatigue: 2,
        },
        response:
          '你没有再解释那次争执，而是在下一轮对抗中提前启动，把球送到队友最舒服的线路上。他接球后回头点了点头。',
        responses: [
          {
            speakerRole: 'teammate',
            text: '{personName}：“这次我知道你要什么了，继续这样踢。”',
          },
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
    condition: {
      growthBackgrounds: ['school'],
    },
    cooldownWeeks: 10,
    choices: [
      {
        id: 'plan',
        text: '提前规划好详细的时间表',
        riskLabel: 'low',
        effects: {
          confidence: 2,
          fatigue: 2,
        },
        response:
          '你把复习、训练和通勤时间全部写进同一张表，连恢复时间也没有省略。安排看起来很满，但至少每件事都有了明确的开始和结束。',
        followUp: '考试周里训练和比赛仍可能临时变动；能否及时调整计划，会成为你真正的课题。',
      },
      {
        id: 'football-first',
        text: '先备战比赛，之后再补课',
        riskLabel: 'medium',
        effects: {
          morale: 2,
          fatigue: 4,
        },
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
    condition: {
      growthBackgrounds: ['community'],
      requireRelocation: false,
    },
    cooldownWeeks: 8,
    choices: [
      {
        id: 'reply',
        text: '回复消息并致以感谢',
        riskLabel: 'low',
        effects: {
          morale: 4,
        },
      },
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
    condition: {
      requireFactType: 'monthly-settlement',
      minReputation: 10,
    },
    cooldownWeeks: 20,
    choices: [
      {
        id: 'note',
        text: '摘录适合自己的部分记进笔记',
        riskLabel: 'low',
        effects: {
          confidence: 3,
          morale: 2,
        },
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
    condition: {
      requireFactType: 'match',
      minReputation: 12,
    },
    cooldownWeeks: 14,
    choices: [
      {
        id: 'meet',
        text: '挥手致意并简单交流',
        riskLabel: 'low',
        effects: {
          morale: 3,
          fatigue: 1,
        },
        response:
          '你走到看台边和球迷打了招呼，没有让短暂的交流变成喧闹。回到训练场时，那张写着你名字的牌子还在，但你的注意力已经收了回来。',
        followUp: '声望会带来更多关注；下一次表现不佳时，你也会更早感受到看台的目光。',
      },
      {
        id: 'leave',
        text: '保持礼貌然后安静离开',
        riskLabel: 'low',
        effects: {
          confidence: 1,
        },
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
    condition: {
      requireActiveInjury: true,
      maxFatigue: 70,
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'gradual',
        text: '按计划逐步恢复训练量',
        riskLabel: 'low',
        effects: {
          fitness: 3,
          fatigue: -2,
          confidence: 2,
        },
        resolution: {
          attribute: 'stamina',
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
              label: '回归节奏稳步建立',
              effects: {
                fitness: 4,
                fatigue: -3,
                confidence: 2,
              },
              response: '你按计划完成恢复训练，在没有逞强的情况下把跑动和对抗一点点加回来。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“回来不是越快越好，是要能一直回来。”',
                },
              ],
              followUp: '接下来两周会按反应逐步增加强度，恢复质量决定你何时回到名单。',
            },
            partial: {
              label: '回归按计划推进',
              effects: {
                fitness: 3,
                fatigue: -2,
                confidence: 2,
              },
              response:
                '你完成了医疗组规定的训练量，身体反应基本稳定，但还需要更多对抗来确认恢复。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“今天通过了，下一步仍然要给身体时间。”',
                },
              ],
              followUp: '教练会在下一次合练后复查反应，暂不提前承诺比赛时间。',
            },
            failure: {
              label: '回归需要放慢',
              effects: {
                fitness: -1,
                fatigue: 3,
                confidence: -2,
              },
              response:
                '你在恢复训练中提前加速，伤处的紧绷感重新出现，训练组只好把负荷降回基础阶段。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“急着证明自己只会让回归再次延后。”',
                },
              ],
              followUp: '下一次训练会重新评估负荷，出现疼痛或异常反应时必须及时报告。',
            },
          },
        },
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
        effects: {
          fitness: 2,
          fatigue: 5,
          confidence: 3,
        },
        resolution: {
          attribute: 'stamina',
          difficulty: 62,
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
              label: '合练顺利找回节奏',
              effects: {
                fitness: 3,
                fatigue: 2,
                confidence: 3,
              },
              response:
                '你参加合练后逐渐找回比赛感觉，训练结束时伤处没有异常，身体允许下一步继续加量。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“状态回来了，但每次加量都要先看恢复反应。”',
                },
              ],
              followUp: '教练会考虑让你进入下一场名单，同时安排额外的恢复观察。',
            },
            partial: {
              label: '合练找到一半状态',
              effects: {
                fitness: 2,
                fatigue: 5,
                confidence: 3,
              },
              response:
                '你完成了合练，触球感觉回来了，但疲劳和紧绷感提醒你还不能立刻恢复全部比赛节奏。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“感觉会回来，名单要等身体给出答案。”',
                },
              ],
              followUp: '下一次合练仍会限制时间，避免一次状态回升换来新的停训。',
            },
            failure: {
              label: '过快合练反应不佳',
              effects: {
                fitness: -2,
                fatigue: 8,
                confidence: -2,
              },
              response:
                '你急着参加完整合练，冲刺后的不适让动作开始变形，医疗组要求你重新回到恢复阶段。',
              responses: [
                {
                  speakerRole: 'youth-coach',
                  text: '{personName}：“回归不是和伤处赌一把，今天的反应已经说明问题。”',
                },
              ],
              followUp: '下一次训练会降低负荷并复查恢复进度，比赛安排暂时顺延。',
            },
          },
        },
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
    condition: {
      maxConfidence: 40,
      requirePersonRole: 'youth-coach',
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'talk',
        text: '坦白说出自己的压力',
        riskLabel: 'low',
        effects: {
          confidence: 4,
          morale: 3,
          coachTrust: 1,
        },
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
        effects: {
          confidence: 2,
          fatigue: 4,
        },
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
    condition: {
      requireActiveInjury: true,
    },
    cooldownWeeks: 6,
    choices: [
      {
        id: 'check',
        text: '仔细检查并调整训练量',
        riskLabel: 'low',
        effects: {
          fatigue: -4,
          fitness: 1,
        },
      },
    ],
  },
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
  {
    id: 'early-prodigy-signal',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 8,
    title: '提前到来的关注',
    description: '你的成长速度超出同龄人的预期，教练组开始讨论是否让你提前接受更高强度的训练。',
    condition: {
      maturationPaces: ['early'],
      minCoachEvaluation: 60,
      minWeek: 8,
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 24,
    choices: [
      {
        id: 'step-up',
        text: '接受更高强度的训练安排',
        riskLabel: 'medium',
        effects: {
          confidence: 3,
          coachTrust: 3,
          fatigue: 5,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“提前面对更高强度，意味着你也要提前学会保护自己。”',
          },
        ],
        response:
          '你接受了升级训练的邀请，第一次合练的节奏几乎不给人喘息。你被迫更快做决定，也第一次感到自己的成长速度正在带来新的压力。',
        followUp: '接下来几周会观察你能否适应更高强度；如果疲劳失控，提前升级也可能变成提前停训。',
      },
      {
        id: 'steady-growth',
        text: '保持现有节奏，继续夯实基础',
        riskLabel: 'low',
        effects: {
          confidence: 2,
          coachTrust: 1,
          fatigue: -1,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“不急着证明自己，能把基础做深也是一种选择。”',
          },
        ],
        response:
          '你谢绝了立刻加码，选择把已有的技术再打磨一遍。别人可能先看到更快的进步，但你知道自己在给未来的强度留余量。',
        followUp: '教练会继续关注你的成长曲线；当基础足够稳定时，更高强度的机会还会再次出现。',
      },
    ],
  },
  {
    id: 'late-bloomer-window',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 7,
    title: '迟来的成长窗口',
    description: '长期稳定的训练开始显现效果，教练认为你正在进入一段此前未被注意到的成长窗口。',
    condition: {
      growthBackgrounds: ['late-bloomer'],
      maturationPaces: ['late'],
      minWeek: 18,
      minProfessionalism: 55,
      minStability: 45,
      requireFactType: 'training',
    },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 24,
    choices: [
      {
        id: 'seize-window',
        text: '主动增加针对性训练',
        riskLabel: 'medium',
        effects: {
          confidence: 4,
          coachTrust: 2,
          fatigue: 4,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“窗口打开了，但不要把每一天都当成最后一天。”',
          },
        ],
        response:
          '你抓住这段迟来的成长窗口，主动把训练时间用在此前最薄弱的环节。进步还没有写进数据表，但动作开始变得更有把握。',
        followUp:
          '接下来的训练会检验这段窗口能持续多久；适度加量能放大成长，过度加量会让疲劳抢走成果。',
      },
      {
        id: 'protect-rhythm',
        text: '维持稳定节奏，避免操之过急',
        riskLabel: 'low',
        effects: {
          confidence: 2,
          morale: 2,
          fatigue: -2,
        },
        responses: [
          {
            speakerRole: 'youth-coach',
            text: '{personName}：“迟来的机会更需要耐心，别让急切替你做决定。”',
          },
        ],
        response:
          '你没有因为终于被注意到就突然改变全部计划，而是保持原有节奏，只增加了最必要的一点专项训练。成长的感觉因此更安静，也更可控。',
        followUp:
          '教练会观察你的稳定进步；如果窗口持续打开，你可以再逐步增加强度，而不必一次押上全部体能。',
      },
    ],
  },
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
