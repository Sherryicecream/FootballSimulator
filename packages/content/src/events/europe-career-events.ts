import type { EventDefinition } from '@football/contracts';
import { createAuthoredResolution } from './authored-outcomes';

const europeCondition = {
  requireOverseas: true,
  overseasRegions: ['europe'] as ('europe' | 'asia')[],
};

/** europe-career：欧洲留洋生涯事件，仅在留洋欧洲期间触发。 */
export const europeCareerEvents: EventDefinition[] = [
  {
    id: 'europe-locker-room-integration',
    version: 1,
    category: 'europe-career',
    rarity: 'uncommon',
    theme: 'relationships',
    interaction: 'decision',
    baseWeight: 26,
    title: '更衣室破冰',
    description:
      '训练结束后的更衣室里，队友们用你听不懂的语言开玩笑。你站在储物柜前，第一次觉得距离是用语言丈量的。',
    condition: { ...europeCondition },
    participantRoles: ['teammate', 'assistant-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'break-the-ice',
        text: '主动邀请邻位的队友留下来互相加练喂球',
        riskLabel: '中',
        effects: { closeness: 1 },
        response: '你主动向队友发出了加练邀请；更衣室的回应需要时间确认。',
        followUp: '主动是融入的第一步；接下来的合练会给出回应。',
        resolution: createAuthoredResolution('composure', 58, {
          success: {
            label: '融入更快',
            effects: { closeness: 3, trust: 2, confidence: 2 },
            response: '加练结束后，他用生硬的外语对你说了句"干得不错"，然后把耳机分了一只给你听。',
            responses: [
              {
                speakerRole: 'teammate',
                text: '{personName}："你是最先主动开口的新援。这个更衣室喜欢这样的人。"',
              },
              {
                speakerRole: 'assistant-coach',
                text: '{personName}："合练里的呼应明显多了，继续这样。"',
              },
            ],
            followUp: '更衣室的墙被你敲开了一条缝；接下来的配合会有更多默契，也会有人替你说话。',
          },
          partial: {
            label: '礼貌回应',
            effects: { closeness: 1, confidence: 1 },
            response: '他答应了加练，全程认真但话不多。结束时你们击了掌，约好每周两次。',
            followUp: '关系是练出来的；你们的默契要先从脚下开始。',
          },
          failure: {
            label: '反应冷淡',
            effects: { confidence: -2, morale: -1 },
            response: '他婉拒了，说身体需要休息。你笑着说没关系，回到储物柜前才发现手心有点汗。',
            followUp: '破冰有时会碰壁；下一次开口前，先让表现替你打招呼。',
          },
        }),
      },
      {
        id: 'wait-patiently',
        text: '耐心等待更衣室自然接纳，先做好自己的事',
        riskLabel: '低',
        effects: { closeness: -1, morale: 1 },
        response:
          '你把精力都放在训练场上。更衣室的玩笑依然与你无关，但每一次成功防守后，看向你的眼神在变化。',
        followUp: '时间站在努力的人这边；只是这段安静的日子，要靠你自己撑住。',
      },
    ],
  },
  {
    id: 'europe-language-tutor',
    version: 1,
    category: 'europe-career',
    rarity: 'common',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 20,
    title: '语言关',
    description:
      '战术会上教练语速很快，你只能听懂关键词。翻译能帮你，但场上没有翻译。队友建议你找个当地语言老师。',
    condition: { ...europeCondition },
    participantRoles: ['family'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'hire-tutor',
        text: '请一位每周两次的语言私教，从战术用语学起',
        riskLabel: '低',
        effects: { closeness: 2, confidence: 1 },
        response:
          '老师把球队常用战术词做成了卡片。一个月后的合练里，你第一次抢在翻译之前理解了教练的调整手势。',
        followUp: '语言正在变成你的装备；教练会注意到你不再需要转述。',
      },
      {
        id: 'rely-translator',
        text: '继续依赖翻译，把时间留给身体恢复',
        riskLabel: '中',
        effects: { fatigue: -1, closeness: -1 },
        response:
          '翻译跟着你进出每一间会议室。生活轻松了一些，但你发现队友聊天时，还是会下意识放慢语速再重复一遍。',
        followUp: '依赖总会变成距离；这个问题迟早要自己面对。',
      },
    ],
  },
  {
    id: 'europe-tactical-style',
    version: 1,
    category: 'europe-career',
    rarity: 'uncommon',
    theme: 'training',
    interaction: 'decision',
    baseWeight: 22,
    title: '战术风格适配',
    description:
      '教练组认为你在国内养成的处理球习惯在这里太冒险，希望你的出球更快、跑位更收。那套习惯曾是你立足的招牌。',
    condition: { ...europeCondition },
    participantRoles: ['youth-coach', 'teammate'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'adapt-first',
        text: '按教练组的要求改，先在训练里练一百次简化出球',
        riskLabel: '中',
        effects: { coachTrust: 1 },
        response: '你开始按教练组的要求调整处理球习惯；改起来没那么快。',
        followUp: '体系的信任要用训练一场一场攒回来。',
        resolution: createAuthoredResolution('decision', 60, {
          success: {
            label: '适配见效',
            effects: { coachTrust: 3, form: 2 },
            response:
              '你把出球时间平均缩短了半秒，联赛里的丢失球权次数降了下来。教练在录像课上把你的片段当教材播放。',
            responses: [
              {
                speakerRole: 'youth-coach',
                text: '{personName}："留住你的招牌，把节奏交给体系。这才是职业球员的改法。"',
              },
            ],
            followUp: '体系开始信任你；你的招牌没有丢，只是学会了在正确的时候出手。',
          },
          partial: {
            label: '理解到位',
            effects: { coachTrust: 1 },
            response: '训练里你能做到，比赛里还会偶尔回到老习惯。教练组决定再给你一些时间。',
            followUp: '改变正在发生；每一次正确的选择都会让体系更放心。',
          },
          failure: {
            label: '一时别扭',
            effects: { form: -2, confidence: -1 },
            response:
              '强行简化让你的传球变得平庸，连续两场你都没了存在感。教练把你叫去单独谈了一次。',
            followUp: '改变需要代价；关键是别在最艰难的时候停下。',
          },
        }),
      },
      {
        id: 'keep-own-style',
        text: '坚持自己成名的踢法，用表现让教练妥协',
        riskLabel: '高',
        effects: { confidence: 1, coachTrust: -2 },
        response:
          '你在训练里照旧踢自己的风格。有一次大胆的盘带过了两个人，也有两次被直接断掉。教练组在报告里写了"需要沟通"。',
        followUp: '风格是你的武器，也是你的风险；和体系的这场谈判，才刚刚开始。',
      },
    ],
  },
  {
    id: 'europe-first-interview',
    version: 1,
    category: 'europe-career',
    rarity: 'uncommon',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 20,
    title: '当地媒体首访',
    description: '本地晚报想采访这位"从东方来的新援"。俱乐部公关问你：是自己上，还是带翻译。',
    condition: { ...europeCondition },
    participantRoles: ['assistant-coach'],
    cooldownWeeks: 12,
    choices: [
      {
        id: 'speak-foreign-language',
        text: '用简单的外语自己完成采访',
        riskLabel: '中',
        effects: { respect: 2, confidence: 1 },
        response:
          '你的句子简单但真诚。报道标题写着："他还在学我们的语言，但已经赢得了我们的尊重。"',
        followUp: '当地媒体记住了你；下一次采访的邀约会更从容。',
      },
      {
        id: 'bring-translator',
        text: '带上翻译，把想说的说完整',
        riskLabel: '低',
        effects: { morale: 1 },
        response: '翻译帮你把每一句话都说得流畅妥帖。报道很正面，只是引用里少了你自己的语气。',
        followUp: '稳妥的选择；等语言跟上，你随时可以自己来。',
      },
    ],
  },
  {
    id: 'europe-homesickness',
    version: 1,
    category: 'europe-career',
    rarity: 'common',
    theme: 'off-pitch',
    interaction: 'decision',
    baseWeight: 18,
    title: '思乡与家人',
    description:
      '连续阴雨的十一月，训练基地到公寓两点一线。母亲在视频里问你"过年回不回得来"，你看着窗外算时差。',
    condition: { ...europeCondition },
    participantRoles: ['family'],
    cooldownWeeks: 14,
    choices: [
      {
        id: 'invite-family',
        text: '安排家人来欧洲住一个月，把公寓变成家',
        riskLabel: '低',
        effects: { morale: 3, fatigue: 1 },
        response:
          '母亲把厨房重新填满了家乡的味道。你带着家人逛了球场和城市，队里的人也开始知道你家常菜的名字。',
        followUp: '心安了，训练的底气也不一样；只是接待家人也消耗精力，注意安排。',
      },
      {
        id: 'push-through',
        text: '靠着视频通话和比赛日熬过这一段',
        riskLabel: '中',
        effects: { morale: 1, confidence: 1 },
        response:
          '你把想家的劲头都练了进去。三周后，你在客场踢了整场最好的一个下半场，视频那头母亲看得直拍手。',
        followUp: '有些坎是自己迈过去的；迈过去之后，你就知道自己能在这待下去。',
      },
    ],
  },
  {
    id: 'europe-scout-spotlight',
    version: 1,
    category: 'europe-career',
    rarity: 'rare',
    theme: 'trajectory',
    interaction: 'decision',
    baseWeight: 16,
    title: '转会聚光灯',
    description:
      '经纪人告知：看台上会出现更大俱乐部的球探，他们这一场就是来看你的。铺天盖地的关注，也可能只是一场普通的联赛。',
    condition: { ...europeCondition, requireFactType: 'pro-match' },
    participantRoles: ['assistant-coach', 'teammate'],
    cooldownWeeks: 16,
    choices: [
      {
        id: 'turn-into-performance',
        text: '把聚光灯变成动力，按自己的节奏踢这场球',
        riskLabel: '中',
        effects: { confidence: 1 },
        response: '你带着聚光灯上场，结果由九十分钟决定。',
        followUp: '无论这场的成色如何，球探的报告已经写下了第一笔。',
        resolution: createAuthoredResolution('composure', 62, {
          success: {
            label: '身价之夜',
            effects: { confidence: 3, coachTrust: 2, respect: 2 },
            response:
              '你送出一记助攻，补防的回追也上了集锦。赛后经纪人的电话被打爆，教练拍着你的背说"我早说过"。',
            responses: [
              {
                speakerRole: 'assistant-coach',
                text: '{personName}："球探看了九十分钟，看到的不是天赋，是习惯。"',
              },
            ],
            followUp: '这一夜改变了你的市场行情；接下来，更稳的表现比更多采访更值钱。',
          },
          partial: {
            label: '中规中矩',
            effects: { confidence: 1 },
            response:
              '你踢了一场扎实的比赛，没有失误也没有高光。球探的记录本上写了几行字，合上了。',
            followUp: '他们还会再来的；把状态保持住，机会不会只敲一次门。',
          },
          failure: {
            label: '发挥失常',
            effects: { confidence: -3, morale: -2 },
            response: '你太想表现自己，两次不必要的盘带葬送了反击。赛后你一个人在更衣室坐了很久。',
            followUp: '聚光灯会放大一切，包括失误；先把这一页翻过去。',
          },
        }),
      },
      {
        id: 'block-noise',
        text: '屏蔽消息源，赛前一晚不看任何报道',
        riskLabel: '低',
        effects: { morale: 1 },
        response:
          '你把手机调成静音，照常吃饭、睡觉、听歌。比赛日你踢得平静，聚光灯来了又走，你都在。',
        followUp: '平常心是你的护城河；球探们的笔记本会慢慢攒满你的名字。',
      },
    ],
  },
];
