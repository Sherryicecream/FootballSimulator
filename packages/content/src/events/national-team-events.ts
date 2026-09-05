import type { EventDefinition } from '@football/contracts';
import { createAuthoredResolution } from './authored-outcomes';

/** national-team：国家队生涯事件，仅在获得国家队资格后触发。 */
export const nationalTeamEvents: EventDefinition[] = [
  {
    id: 'national-squad-room',
    version: 1,
    category: 'national-team',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 24,
    title: '国家队更衣室',
    description:
      '集训第一天，更衣室里坐着平时联赛里的对手。上个月你们还在场上互不放让，现在教练把你们安排在了同一张战术板上。',
    condition: { requireNationalTeam: true },
    participantRoles: ['teammate'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'share-notes',
        text: '主动找联赛对手聊，互相拆解彼此的踢法',
        riskLabel: '低',
        effects: { respect: 2, closeness: 2 },
        response:
          '他把防守你的心得摊开来讲，你把自己最难防的一次跑位也说了。合练分组时，教练把你们放在了同一组。',
        followUp: '国家队的意义就在这里；互相知根知底的人，才能踢成一个人。',
      },
      {
        id: 'keep-distance',
        text: '保持距离，专注调整自己的状态',
        riskLabel: '中',
        effects: { confidence: 1 },
        response:
          '你礼貌地和所有人打了招呼，然后把时间都花在录像和理疗上。状态调得很好，只是更衣室里的玩笑你一个都没听到。',
        followUp: '用状态立足没有错；只是国家队的更衣室，也是要经营的阵地。',
      },
    ],
  },
  {
    id: 'national-coach-role',
    version: 1,
    category: 'national-team',
    rarity: 'uncommon',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 22,
    title: '主帅定位对话',
    description:
      '国家队主教练把你叫到房间，关上门问你："说说看，你在国家队想成为什么样的球员？"',
    condition: { requireNationalTeam: true },
    participantRoles: ['youth-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'claim-starting-role',
        text: '直言想竞争主力位置，并说出自己的依据',
        riskLabel: '中',
        effects: { confidence: 1 },
                response: '你向主教练表明了竞争主力的想法；答复不会马上到来。',
        followUp: '国家队的轮换名单会在接下来的训练里逐步成形。',
resolution: createAuthoredResolution('composure', 60, {
          success: {
            label: '获得认可',
            effects: { confidence: 3, respect: 2, fatigue: 1 },
            response:
              '你逐条讲了自己的数据和适配的战术位。主教练听完没有立刻表态，但当晚的战术板演练，你出现在了第一组。',
            responses: [
              {
                speakerRole: 'youth-coach',
                text: '{personName}："敢要位置的人，我才放心把位置给他。接下来用训练保住它。"',
              },
            ],
            followUp: '第一组意味着离主力最近；接下来的每一堂训练课都是对你的复核。',
          },
          partial: {
            label: '竞争开始',
            effects: { confidence: 1, respect: 1 },
            response: '主教练点了点头："有野心是好事，先从轮换做起。"你被列入了重点考察名单。',
            followUp: '机会给有准备的人；轮换到主力的距离，要用表现一厘米一厘米地缩短。',
          },
          failure: {
            label: '印象平平',
            effects: { confidence: -2 },
            response: '你的表述有些紧张，条理没跟上想法。主教练客气地结束了谈话："先融进团队。"',
            followUp: '第一印象没能加分；下一次机会要等更久，但你还有整个集训期。',
          },
        }),
      },
      {
        id: 'accept-any-role',
        text: '表示服从任何安排，把定位交给教练决定',
        riskLabel: '低',
        effects: { coachTrust: 2, confidence: -1 },
        response:
          '主教练欣赏你的态度："团队需要这样的人。"你成了训练里哪里需要去哪里的那一个。',
        followUp: '可靠是无声的通行证；只是心里的那个位置，还得自己找机会去争。',
      },
    ],
  },
  {
    id: 'national-window-fatigue',
    version: 1,
    category: 'national-team',
    rarity: 'common',
    theme: 'health',
    interaction: 'decision',
    baseWeight: 24,
    title: '窗口归来',
    description:
      '两个国际比赛日加两段跨时区飞行，回到俱乐部时你的睡眠表已经乱成了一团。俱乐部教练在等着他的主力回归。',
    condition: { requireNationalTeam: true, minCaps: 1 },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 10,
    choices: [
      {
        id: 'managed-recovery',
        text: '把身体数据交给队医，按渐进方案恢复',
        riskLabel: '低',
        effects: { fatigue: -1 },
                response: '你把窗口后的身体管理交给了恢复方案；效果几天后见分晓。',
        followUp: '俱乐部教练在等一个完整状态的你；别让疲劳把机会变成风险。',
resolution: createAuthoredResolution('stamina', 54, {
          success: {
            label: '状态回来',
            effects: { fitness: 2, fatigue: -3 },
            response:
              '两天调整、一天合练，周末的你跑动距离回到了赛季平均值之上。教练在赛后说国家队没白去。',
            followUp: '自律的恢复换来了完整的周末；俱乐部和国脚身份，第一次没有打架。',
          },
          partial: {
            label: '恢复过半',
            effects: { fatigue: -2 },
            response: '时差好了一半，腿还有点沉。教练决定让你先从替补席找回节奏。',
            followUp: '慢一点没关系；别在疲惫时逞强，机会会再来。',
          },
          failure: {
            label: '疲劳堆积',
            effects: { fatigue: 2, fitness: -1 },
            response: '合练第二天你就拉伤了小腿。队医摇头："你把国家队和俱乐部都排满了。"',
            followUp: '接下来两场你只能看着；这次教训要记进下一次窗口的安排里。',
          },
        }),
      },
      {
        id: 'straight-back',
        text: '跳过调整直接合练，向俱乐部证明投入',
        riskLabel: '高',
        effects: { fatigue: 2, coachTrust: 1 },
        response:
          '你第一天就参加了全组合练，冲在最前面。教练对你的态度很满意，体能报告上的红色数字他选择暂时没看。',
        followUp: '态度分已经拿到；这笔疲劳账什么时候清算，由你的身体决定。',
      },
    ],
  },
  {
    id: 'national-first-interview',
    version: 1,
    category: 'national-team',
    rarity: 'uncommon',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 20,
    title: '国脚专访',
    description:
      '成为国脚之后，第一次有专访找上门。记者的第一个问题是："你觉得国家队的未来里有你吗？"',
    condition: { requireNationalTeam: true },
    participantRoles: ['family'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'grand-vision',
        text: '认真作答，谈自己想陪国家队走的路',
        riskLabel: '低',
        effects: { confidence: 2, respect: 1 },
        response:
          '你讲了青训、讲了落选的人、讲了想赢下的那座奖杯。稿件发出后，评论里第一次有人叫你"我们的中场"。',
        followUp: '公开的承诺会变成压力，也会变成旗帜；你选择举着它。',
      },
      {
        id: 'stay-humble',
        text: '把话题拉回每一场比赛',
        riskLabel: '低',
        effects: { coachTrust: 1 },
        response:
          '你只谈下一场比赛和眼前的训练。采访发出来很短，教练组却把这篇报道转发了内部群。',
        followUp: '谦逊是国家队最不缺的品格，也是最难保持的品格。',
      },
    ],
  },
  {
    id: 'national-veteran-mentor',
    version: 1,
    category: 'national-team',
    rarity: 'common',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 20,
    title: '老国脚传帮带',
    description:
      '队里资历最老的国脚在录像室门口叫住你："一起来?"他职业生涯的三届大赛经历，都写在那些比赛录像的暂停键里。',
    condition: { requireNationalTeam: true, minCaps: 5 },
    participantRoles: ['teammate'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'learn-humbly',
        text: '搬个椅子坐下，把每个暂停都问明白',
        riskLabel: '低',
        effects: { respect: 2, closeness: 1 },
        response:
          '他讲到第三次大赛时打开了话匣子：怎么读对手的界外球习惯，怎么在点球点前呼吸。你记满了两页纸。',
        followUp: '有些经验书本上没有；这份传承，等你老了也要传下去。',
      },
      {
        id: 'keep-pace',
        text: '道谢但先去加练，把课程改天再补',
        riskLabel: '中',
        effects: { trust: 1, closeness: -1 },
        response:
          '你感谢了他的好意，说想先把身体练到位。他点点头没说什么，录像室的灯亮到了很晚。',
        followUp: '勤奋没错；只是有些课，错过一期要等下一次集训。',
      },
    ],
  },
];
