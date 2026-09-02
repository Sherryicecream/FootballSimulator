import type { EventDefinition } from '@football/contracts';
import { balancedOneOffEvents } from './one-off-events';
import { shortStoryEvents } from './story-events';
import { trajectoryEvents } from './trajectory-events';
import { branchingStoryEvents } from './branching-story-events';

const legacyYouthEvents: EventDefinition[] = [
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
    condition: { requirePersonRole: 'teammate', requireFactType: 'training' },
    participantRoles: ['youth-coach', 'teammate'],
    storyId: 'misunderstanding-opened',
    nextEvents: ['misunderstanding-repair'],
    cooldownWeeks: 18,
    choices: [
      {
        id: 'clarify',
        text: '当面澄清误会，把训练中的情况说清楚',
        riskLabel: 'medium',
        effects: { respect: 3, trust: 2, confidence: 2 },
        resolution: {
          attribute: 'decision',
          difficulty: 58,
          volatility: 7,
          stateModifiers: { confidence: 0.2, fatigue: -0.1, coachTrust: 0.15 },
          outcomes: {
            success: {
              label: '沟通奏效',
              effects: { respect: 4, trust: 3, confidence: 3, coachTrust: 2 },
              response: '你把事实、感受和下一次配合分开说清楚，教练没有再追问，队友也主动把误会放下。',
              followUp: '教练会把这次沟通记在心里；下一场比赛，你们的默契会成为新的观察点。',
            },
            partial: {
              label: '误会缓和',
              effects: { respect: 2, trust: 1, confidence: 1 },
              response: '你的解释让气氛缓和下来，但队友仍需要几次训练确认你们能否真正配合。',
              followUp: '下一场比赛的第一次沟通将决定这次澄清能否留下来。',
            },
            failure: {
              label: '解释被误解',
              effects: { respect: -1, trust: -2, confidence: -2, coachTrust: -2 },
              response: '你试图把话说清楚，却被听成了推责；教练让你们先回到训练，不再继续争辩。',
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
        effects: { confidence: 1, morale: -1 },
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
        effects: { trust: 2, respect: 2 },
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
        effects: { respect: 1 },
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
        effects: { morale: 5, coachTrust: 3 },
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
        effects: { morale: 3, coachTrust: 5 },
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
        effects: { coachTrust: -2, morale: -2 },
        response:
          '你先向全队道歉，再把迟到的原因说明白。教练没有当众训斥你，只让你补完热身后再加入分组。',
        followUp: '今天的信任受到了轻微影响；接下来几周准时到场，会比再次解释更快修复印象。',
      },
      {
        id: 'lt-quiet',
        text: '默默加入训练，用表现说话',
        riskLabel: 'medium',
        effects: { coachTrust: -5, morale: -1 },
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
        effects: { morale: 5, fatigue: 3 },
        memoryKey: 'team-bonding',
        response:
          '你答应了周末的火锅局，原本只在训练场说话的几个人开始聊起各自的家乡。笑声很多，回到宿舍时也确实比平时更累。',
        followUp: '更衣室里的熟悉感会让下一次配合更自然，但社交安排也会占用你的恢复时间。',
      },
      {
        id: 'ti-rest',
        text: '婉拒，周末想休息一下',
        riskLabel: 'low',
        effects: { morale: 1, fatigue: -3 },
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
    condition: { requireActiveInjury: true },
    participantRoles: ['youth-coach'],
    choices: [
      {
        id: 'mi-rest',
        text: '听从队医建议，休息恢复',
        riskLabel: 'low',
        effects: { fatigue: -10, coachTrust: -2, morale: -2 },
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
        effects: { fatigue: 10, coachTrust: 3, morale: 3 },
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
    condition: { requirePersonRole: 'rival' },
    participantRoles: ['rival', 'youth-coach'],
    choices: [
      {
        id: 'cw-train-harder',
        text: '加练，用实力证明自己',
        riskLabel: 'medium',
        effects: { fatigue: 8, coachTrust: 4, morale: 3 },
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
        effects: { morale: 2, coachTrust: 1 },
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
    condition: { requirePersonRole: 'family' },
    participantRoles: ['family'],
    choices: [
      {
        id: 'fs-touched',
        text: '心里暖暖的，更加坚定',
        riskLabel: 'low',
        effects: { morale: 6 },
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
        effects: { morale: 2, coachTrust: 1 },
        responses: [
          { speakerRole: 'family', text: '{personName}：“知道你忙，训练结束记得回个消息就好。”' },
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
        effects: { morale: 2, fatigue: 2 },
        response:
          '你把本周的训练记录摊开，给下一阶段写下了三个可以检查的小目标。计划没有让你立刻变强，却让平淡的日子有了方向。',
        followUp:
          '下个月的训练报告会告诉你哪些目标真正完成；如果计划过满，也要学会及时删掉不现实的部分。',
      },
      {
        id: 'qw-rest',
        text: '好好休息，为下一周充电',
        riskLabel: 'low',
        effects: { fatigue: -5, morale: 1 },
        response:
          '你没有给安静的一周强行安排一场证明自己的戏，而是认真睡足、拉伸，给身体留出恢复空间。',
        followUp: '下一周你会用更好的体能重新开始；休息只有在回到训练时转化成专注，才不是逃避。',
      },
    ],
    cooldownWeeks: 3,
  },
  // 🏋️ 训练维度：额外加练
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
        effects: { fatigue: 5, coachTrust: 2, morale: 2 },
        response:
          '你留下来把最后几组动作做完，空场里的每一次触球都听得很清楚。教练路过时没有打扰，只在训练记录上多写了一行。',
        followUp:
          '加练会增加教练对你投入度的印象，但如果恢复跟不上，额外训练也可能反过来削弱比赛状态。',
      },
      {
        id: 'et-rest',
        text: '回去休息，明天还有训练',
        riskLabel: 'low',
        effects: { fatigue: -3, morale: 1 },
        response:
          '你收好球鞋离开球场，把今天的训练停在一个还算舒服的节点。第二天早晨醒来时，腿部没有想象中那么沉。',
        followUp:
          '合理恢复会让你在连续训练中保持质量；教练也会观察你是否能把休息变成更稳定的表现。',
      },
    ],
    cooldownWeeks: 5,
  },
  // ⚽ 比赛维度：首秀机会
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
        effects: { morale: 8, coachTrust: 5 },
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
        effects: { morale: 3, coachTrust: 2 },
        memoryKey: 'debut-nervous',
        response:
          '你承认自己紧张，教练没有笑你，只让你先把最简单的接球和回防做好。说出紧张之后，心跳反而慢了一点。',
        followUp:
          '如果获得登场机会，教练会先要求你执行基础任务；稳定完成第一步，比急着证明自己更重要。',
      },
    ],
    cooldownWeeks: 10,
  },
  // 👥 关系维度：更衣室冲突
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
        effects: { morale: 3, coachTrust: 2 },
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
        effects: { morale: -1 },
        memoryKey: 'conflict-stayed-out',
        response:
          '你拿起背包离开了更衣室，把争执留给当事人。没有人因此责怪你，但走廊里传来的沉默让这次训练显得格外漫长。',
        followUp:
          '你避免了被卷入冲突，也失去了一次建立更衣室信任的机会；之后的训练气氛仍可能受到影响。',
      },
    ],
    cooldownWeeks: 10,
  },
  // 🏠 生活维度：社交与休息
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
        effects: { morale: 4, fatigue: 4 },
        response:
          '你加入了队友的周末安排，训练场之外的玩笑让几个人的距离近了不少。回程时大家都在说下一场怎么配合。',
        followUp:
          '更好的熟悉感可能转化成比赛中的默契，但额外社交会消耗恢复时间，下一次训练要留意身体信号。',
      },
      {
        id: 'sr-rest',
        text: '在家休息，恢复体力',
        riskLabel: 'low',
        effects: { fatigue: -5, morale: 1 },
        response:
          '你关掉消息提醒，把周末交给睡眠、拉伸和一顿好好吃完的饭。没有热闹的故事发生，但周一的双腿轻了不少。',
        followUp: '恢复会提高你应对下一周训练的余量；和队友的关系则需要在平日里用稳定的配合维持。',
      },
    ],
    cooldownWeeks: 5,
  },
  // 🏥 健康维度：体能测试
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
        effects: { fitness: 5, fatigue: 8, coachTrust: 3, morale: 2 },
        response:
          '你在最后几分钟把速度推到极限，冲线时几乎站不稳。成绩排进了队内前列，教练也注意到你愿意在疲劳下坚持。',
        followUp: '更高的体能评价会带来训练机会，但短期疲劳会增加；下一次比赛前必须把恢复补回来。',
      },
      {
        id: 'ft-pace',
        text: '按自己的节奏跑，安全第一',
        riskLabel: 'low',
        effects: { fitness: 2, fatigue: 3, morale: 1 },
        response:
          '你没有被旁边的冲刺带乱节奏，按计划完成了测试。成绩不算最亮眼，却从头到尾保持了可控的呼吸。',
        followUp:
          '教练会把稳定性纳入评价；如果想提高排名，下一次需要在保持节奏的基础上逐步提高上限。',
      },
    ],
    cooldownWeeks: 8,
  },
  // 🧠 心理维度①：信心危机
  {
    id: 'confidence-crisis',
    version: 1,
    category: 'china-youth',
    rarity: 'uncommon',
    title: '信心危机',
    description:
      '最近几场训练中你频频出现失误，队友开始有些不耐烦了。你开始怀疑自己是否真的适合踢球，晚上躺在床上辗转难眠。',
    condition: {},
    choices: [
      {
        id: 'cc-push-through',
        text: '加倍努力，用汗水克服困难',
        riskLabel: 'medium',
        effects: { morale: -3, fatigue: 8, coachTrust: 3 },
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
        effects: { morale: 2, fatigue: 2, coachTrust: 4 },
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
  // 🧠 心理维度②：媒体关注
  {
    id: 'media-attention',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    title: '媒体的关注',
    description:
      '你在上一场比赛中的出色表现引起了本地媒体的注意。一名记者来到训练基地，想要采访你——这是你第一次面对镜头。',
    condition: { minReputation: 10, requireFactType: 'match', requireFactText: '突出表现' },
    participantRoles: ['youth-coach'],
    choices: [
      {
        id: 'ma-accept',
        text: '接受采访，自信表达',
        riskLabel: 'medium',
        effects: { morale: 5, coachTrust: 1 },
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
        effects: { morale: 1, coachTrust: 3 },
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
  // 🎯 发展维度①：球探观察
  {
    id: 'scout-watching',
    version: 1,
    category: 'china-youth',
    rarity: 'rare',
    title: '球探在看你',
    description:
      '今天的训练场上来了几张陌生的面孔——听队友说，那是来自其他俱乐部青年队的球探。他们在场边认真记录着每个球员的表现。',
    condition: { minReputation: 15 },
    choices: [
      {
        id: 'sw-show-off',
        text: '尽情展示自己，冒点险也值得',
        riskLabel: 'high',
        effects: { morale: 5, coachTrust: 2, fatigue: 5 },
        response:
          '你在球探面前尝试了几次平时不敢用的处理，成功时全场都看见了，失误时也同样明显。训练结束后，陌生人收起了记录本。',
        followUp:
          '球探可能记住你的上限，也会记住你的冒险成本；下一次展示需要证明今天的亮点不是偶然。',
      },
      {
        id: 'sw-normal',
        text: '保持平常心，正常发挥',
        riskLabel: 'low',
        effects: { morale: 2, coachTrust: 1 },
        response:
          '你没有为了看台边的陌生面孔改变踢法，仍然按平时的节奏完成训练。球探没有特别表态，但在你做出几次正确选择时抬头看了很久。',
        followUp:
          '稳定性会让外部关注更可信；如果球探继续跟踪，你需要在不同强度下保持同样的基本功。',
      },
    ],
    cooldownWeeks: 15,
  },
  // 🎯 发展维度②：试训邀请
  {
    id: 'trial-invitation',
    version: 1,
    category: 'china-youth',
    rarity: 'legendary',
    title: '试训邀请',
    description:
      '你的表现引起了一家知名俱乐部青训营的注意！他们发来了一份为期一周的试训邀请函。如果表现出色，有可能被正式录取。这是一个改变命运的机会。',
    condition: { minReputation: 25 },
    choices: [
      {
        id: 'ti-go',
        text: '接受邀请，去更高平台挑战',
        riskLabel: 'high',
        effects: { morale: 10, coachTrust: 5, fatigue: 5 },
        response:
          '你接受了试训邀请，第一次走进更高水平的训练场。节奏比熟悉的环境更快，但你没有把陌生感当成退缩的理由。',
        followUp:
          '试训结果取决于连续几天的表现；这次经历也会让当前教练重新评估你面对更高强度的准备程度。',
      },
      {
        id: 'ti-stay',
        text: '婉拒，留在当前俱乐部继续磨练',
        riskLabel: 'low',
        effects: { morale: 3, coachTrust: 5 },
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
    condition: { requireRelocation: true, requirePersonRole: 'family' },
    participantRoles: ['family'],
    choices: [
      {
        id: 'rh-call-home',
        text: '给家里打电话',
        riskLabel: 'low',
        effects: { morale: 4, closeness: 3 },
        responses: [
          { speakerRole: 'family', text: '{personName}：“想家就说出来，这里永远有你的饭和灯。”' },
        ],
        response:
          '你把最近不习惯的地方一件件说出来，电话那头没有催你坚强，只陪你聊到情绪慢慢平下来。',
        followUp: '与家人的联系会成为异地生活的稳定支点；下一次低谷时，你也更容易主动求助。',
      },
      {
        id: 'rh-adapt',
        text: '整理房间并适应新生活',
        riskLabel: 'medium',
        effects: { confidence: 3, morale: -1 },
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
    condition: { requireFactType: 'match' },
    choices: [
      {
        id: 'as-plan',
        text: '和助教制定补课计划',
        riskLabel: 'low',
        effects: { fatigue: 2, confidence: 2 },
        response:
          '你把缺掉的课程列出来，和助教一起把补课安排塞进训练日程。时间变得更紧，但至少不再靠临时熬夜补洞。',
        followUp:
          '之后还会遇到比赛和课程冲突；这次计划能否执行，会影响教练组对你自我管理能力的判断。',
      },
      {
        id: 'as-delay',
        text: '先专注下一场比赛',
        riskLabel: 'medium',
        effects: { fatigue: -2, morale: -2 },
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
    condition: { requireFactType: 'monthly-settlement', minReputation: 10 },
    choices: [
      {
        id: 'im-learn',
        text: '记录他的训练建议',
        riskLabel: 'low',
        effects: { confidence: 4, morale: 3 },
        response:
          '你没有只记下偶像说过的漂亮话，而是把能在自己训练里尝试的步骤逐条写下。笔记最后多了一行：先验证，再崇拜。',
        followUp:
          '新的方法会在接下来训练中接受检验；真正留下来的不会是偶像的名字，而是适合你身体和位置的习惯。',
      },
      {
        id: 'im-own-way',
        text: '把鼓励化为自己的风格',
        riskLabel: 'low',
        effects: { confidence: 5 },
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
    condition: { requireFactType: 'match', requireFactText: '爆冷' },
    participantRoles: ['youth-coach', 'teammate'],
    choices: [
      {
        id: 'ua-grounded',
        text: '和队友复盘比赛细节',
        riskLabel: 'low',
        effects: { respect: 3, confidence: 2 },
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
        effects: { morale: 6, fatigue: 3, closeness: 2 },
        responses: [
          { speakerRole: 'youth-coach', text: '{personName}：“今晚可以庆祝，明早还是按时训练。”' },
          { speakerRole: 'teammate', text: '{personName}：“这次我们一起扛住了，下一场也别松。”' },
        ],
        response:
          '你和队友把更衣室的音乐开到最大，第一次真正感到自己属于这支队伍。笑声散去后，疲劳也比平时更明显。',
        followUp:
          '团队亲近感会上升，但教练会很快把注意力拉回下一场比赛；庆祝后的恢复将影响你们能否延续状态。',
      },
    ],
    cooldownWeeks: 18,
  },
];

export const youthEvents: EventDefinition[] = [
  ...legacyYouthEvents,
  ...balancedOneOffEvents,
  ...shortStoryEvents,
  ...trajectoryEvents,
  ...branchingStoryEvents,
];

export function getYouthEvents(): EventDefinition[] {
  return youthEvents;
}
