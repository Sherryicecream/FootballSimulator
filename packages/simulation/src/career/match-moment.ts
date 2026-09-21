import type {
  CareerLedgerEntryV2,
  CareerSaveV2Like,
  MatchContext,
  Position,
  YouthEventInstance,
} from '@football/contracts';
import { createSeededRandomSource } from '../randomness';
import type { ChoiceResolutionAttribute } from '@football/contracts';

type RiskLabel = 'low' | 'medium' | 'high';

export interface ImportantMatchInput {
  competitionId?: string | undefined;
  opponentStrength: number;
  played: boolean;
}

const LEAGUE_STRENGTH_THRESHOLD = 82;

/** 重要比赛判定：国内杯淘汰赛、或达到门槛的强强对话（青训/职业同门槛）；球员必须实际出场。 */
export const isImportantMatchContext = (input: ImportantMatchInput): boolean => {
  if (!input.played) return false;
  if (input.competitionId === 'domestic-cup') return true;
  return input.opponentStrength >= LEAGUE_STRENGTH_THRESHOLD;
};

const MATCH_SUMMARY = /^(.+?)\s+(\d+):(\d+)(?:；|;)/;

const riskLabelForDifficulty = (difficulty: number): RiskLabel =>
  difficulty >= 60 ? 'high' : difficulty >= 56 ? 'medium' : 'low';

interface PositionIntentInput {
  id: string;
  text: string;
  attribute: ChoiceResolutionAttribute;
  difficulty: number;
  success: string;
  partial: string;
  failure: string;
}

const ZERO_STATE_MODIFIERS = {
  morale: 0,
  form: 0,
  confidence: 0,
  fitness: 0,
  fatigue: 0,
  coachTrust: 0,
} as const;

const intent = (input: PositionIntentInput) => ({
  id: input.id,
  text: input.text,
  riskLabel: riskLabelForDifficulty(input.difficulty),
  effects: { confidence: 1 },
  response: input.partial,
  followUp: '这场重要比赛的表现会被教练组和关注你的人记在心里。',
  resolution: {
    attribute: input.attribute,
    difficulty: input.difficulty,
    volatility: 5,
    stateModifiers: ZERO_STATE_MODIFIERS,
    outcomes: {
      success: {
        label: '高光时刻',
        effects: { confidence: 3, coachTrust: 2, morale: 2 },
        response: input.success,
      },
      partial: {
        label: '差之毫厘',
        effects: { confidence: 1, coachTrust: 1 },
        response: input.partial,
      },
      failure: {
        label: '陷入困境',
        effects: { confidence: -2, coachTrust: -1, morale: -1 },
        response: input.failure,
      },
    },
  },
});

interface PositionIntentChoice {
  id: string;
  text: string;
  riskLabel: string;
  effects: Record<string, number>;
  response: string;
  followUp: string;
  resolution: {
    attribute: ChoiceResolutionAttribute;
    difficulty: number;
    volatility: number;
    stateModifiers: typeof ZERO_STATE_MODIFIERS;
    outcomes: {
      success: { label: string; effects: Record<string, number>; response: string };
      partial: { label: string; effects: Record<string, number>; response: string };
      failure: { label: string; effects: Record<string, number>; response: string };
    };
  };
}

const POSITION_INTENTS: Record<Position, PositionIntentChoice[]> = {
  FORWARD: [
    intent({
      id: 'fm-attack-space',
      text: '反越位前插，抢在门将之前处理球',
      attribute: 'shooting',
      difficulty: 62,
      success: '你精准判断了防线身后的空当，接球、调整、完成了一次干净的处理，跑位价值被清楚看见。',
      partial: '你跑到了位置，但最后一下处理被门将抢先半拍，没能形成有效攻门。',
      failure: '启动时机晚了一步，你被中卫提前卡住身位，这次进攻以越位告终。',
    }),
    intent({
      id: 'fm-drop-link',
      text: '回撤做球，为队友拉出进攻空当',
      attribute: 'passing',
      difficulty: 55,
      success: '你回撤接应后的一脚出球直接打穿了中场线，队友因此获得了向前推进的空间。',
      partial: '你把球安全地做了出去，进攻得以延续，但没有真正撕开对手的阵型。',
      failure: '回撤拿球后被就地反抢，对手由守转攻，队友不得不回追补位。',
    }),
    intent({
      id: 'fm-press-line',
      text: '持续冲击对方中卫，逼迫出球失误',
      attribute: 'pace',
      difficulty: 58,
      success: '你的连续逼抢让对手中卫慌乱出球，这次前场反抢直接形成了一次绝佳机会。',
      partial: '你把对手中卫逼得只能回传门将，压迫起了效果但还没换来实质机会。',
      failure: '高强度冲刺消耗了你太多体力，接下来的几次对抗你都慢了半步。',
    }),
  ],
  WINGER: [
    intent({
      id: 'wg-cut-inside',
      text: '内切横向盘带，寻找起脚角度',
      attribute: 'dribbling',
      difficulty: 60,
      success: '你连续变向内切晃开角度，那脚打门让门将做出全场最难的一次扑救。',
      partial: '你内切制造了混乱，可惜最后的起脚被补防的边卫封堵出底线。',
      failure: '变向时球被断，对手立刻发动快速反击，你只能拼命回追。',
    }),
    intent({
      id: 'wg-byline-cross',
      text: '强行下底，把传中送进危险区',
      attribute: 'passing',
      difficulty: 57,
      success: '你硬吃了边卫完成下底，那记倒三角传中把球送到危险区域，队友获得了直接处理的机会。',
      partial: '你的传中造成了一片混乱，可惜包抄的队友没能碰到皮球。',
      failure: '下底被边卫贴死，你的传中直接出了底线，看台传来一阵叹息。',
    }),
    intent({
      id: 'wg-attack-behind',
      text: '盯住边卫身后，反复冲击空当',
      attribute: 'pace',
      difficulty: 59,
      success: '你第三次冲击身后时终于甩开了防守，单刀机会让对手防线风声鹤唳。',
      partial: '你两次冲击身后制造了角球和任意球，威胁在持续累积。',
      failure: '对手开始造越位，你两次掉进陷阱，冲刺的体力也见了底。',
    }),
  ],
  DEFENSIVE_MIDFIELDER: [
    intent({
      id: 'dm-protect-center-back',
      text: '保护中卫身前区域',
      attribute: 'defending',
      difficulty: 54,
      success: '你及时回收到中卫身前，切断了对手最直接的推进线路，防线因此获得了重新落位的时间。',
      partial: '你回收到了危险区域，对手的推进被迫放慢，但防线仍承受着压力。',
      failure: '你回收的时机慢了一拍，对手在中卫身前找到接应点，防线被迫持续后退。',
    }),
    intent({
      id: 'dm-intercept-lane',
      text: '拦截对手的传球线路',
      attribute: 'decision',
      difficulty: 59,
      success: '你提前读到传球方向并完成拦截，球队立刻获得了向前推进的空间。',
      partial: '你封住了最危险的线路，对手只能横向转移，进攻速度被压了下来。',
      failure: '你判断错了传球时机，对手从另一侧绕开了拦截区域。',
    }),
    intent({
      id: 'dm-first-pass',
      text: '完成第一脚向前出球',
      attribute: 'passing',
      difficulty: 55,
      success: '你停球后第一脚出球准确找到前场队友，球队顺利把防守转换成了进攻。',
      partial: '你稳稳把球送离压力区域，球队得以重新组织，但推进速度并不快。',
      failure: '你第一脚出球被对手逼得仓促，球队只好重新回收阵型。',
    }),
  ],
  MIDFIELDER: [
    intent({
      id: 'mf-through-ball',
      text: '送出直塞，打穿防线身后',
      attribute: 'vision',
      difficulty: 61,
      success: '你的直塞球精准穿过两人缝隙，前锋获得单刀，这是全场最致命的一次输送。',
      partial: '你的直塞被中卫奋力争到第一点，进攻重新回到中场组织。',
      failure: '直塞线路被预判，对手就地反击，你的这次冒险变成了险情。',
    }),
    intent({
      id: 'mf-long-shot',
      text: '禁区前沿远射试探门将',
      attribute: 'shooting',
      difficulty: 62,
      success: '你在禁区前沿突施冷箭，皮球直挂死角，这粒远射会成为赛后所有集锦的开头。',
      partial: '远射势大力沉但稍稍偏出，门将惊出一身冷汗，角球险些造成混乱。',
      failure: '远射被防守队员用身体挡出，对手顺势打出快速反击。',
    }),
    intent({
      id: 'mf-control-tempo',
      text: '控制节奏，稳住攻防转换',
      attribute: 'passing',
      difficulty: 53,
      success: '你用连续的横传和转移压住了比赛节奏，对手的逼抢在你的调度下逐渐失效。',
      partial: '你稳稳地完成了几次由守转攻的输送，比赛回到对己方有利的轨道。',
      failure: '节奏控制没能成型，对手的高位逼抢让你两次仓促出球失误。',
    }),
  ],
  FULL_BACK: [
    intent({
      id: 'fb-overlap-run',
      text: '套边前插，参与这一波进攻',
      attribute: 'stamina',
      difficulty: 58,
      success: '你的套边前插让边锋获得了出球线路，前插形成了清晰的进攻配合。',
      partial: '你前插到位并送出了传中，可惜落点被对方中卫解围。',
      failure: '前插后球权转换，你身后的空当被打穿，回追消耗了巨大的体能。',
    }),
    intent({
      id: 'fb-tuck-inside',
      text: '内收保护肋部空当',
      attribute: 'defending',
      difficulty: 55,
      success: '你的内收补位掐断了对手最有威胁的肋部配合，中场开始放心地把球交给你。',
      partial: '你及时回收到肋部，对手的直塞没有形成实质威胁。',
      failure: '内收后边路暴露，对手边锋获得了一对一的起球空间。',
    }),
    intent({
      id: 'fb-press-winger',
      text: '贴身压迫对手边锋',
      attribute: 'pace',
      difficulty: 57,
      success: '你的贴身压迫让对手边锋整场没有舒服拿过球，这次直接抢断点燃了反击。',
      partial: '你迫使对手边锋两次回传，压迫效果在慢慢累积。',
      failure: '对手边锋一个变向把你过掉，你只能目送传中飞向禁区。',
    }),
  ],
  CENTER_BACK: [
    intent({
      id: 'cb-step-intercept',
      text: '上抢拦截，提前化解这次威胁',
      attribute: 'defending',
      difficulty: 58,
      success: '你果断上抢把球断下，对手这次最有威胁的进攻被你在萌芽阶段终结。',
      partial: '上抢没能断下皮球，但你迫使对手仓促转移，威胁降级了。',
      failure: '上抢被过，防线瞬间暴露，队友补位才没有酿成失球。',
    }),
    intent({
      id: 'cb-hold-line',
      text: '保持站位，指挥防线收缩',
      attribute: 'composure',
      difficulty: 52,
      success: '你在最混乱的时刻稳住了防线站位，队友们跟着你的呼喊重新落位。',
      partial: '你保持了阵型完整，对手的强攻没能找到空当。',
      failure: '对手的穿插让你的指挥没能传到位，防线出现了短暂的脱节。',
    }),
    intent({
      id: 'cb-set-piece',
      text: '定位球前插攻坚',
      attribute: 'aerialAbility',
      difficulty: 62,
      success: '你在角球进攻中力压防守队员完成头球攻门，门将作出了关键扑救。',
      partial: '你的头球攻门稍稍高出横梁，差之毫厘。',
      failure: '定位球进攻中你被提前卡住位置，这次机会化为乌有。',
    }),
  ],
};

const POSITION_LABELS: Record<Position, string> = {
  FORWARD: '锋线',
  WINGER: '边路',
  DEFENSIVE_MIDFIELDER: '后腰',
  MIDFIELDER: '中场',
  FULL_BACK: '边卫',
  CENTER_BACK: '防线',
};

const RESULT_TEXT = {
  win: '球队占得上风',
  draw: '双方僵持不下',
  loss: '球队处于被动',
} as const;

type MatchResult = keyof typeof RESULT_TEXT;

interface MatchOutcome {
  result: MatchResult;
  ownScore: string;
  opponentScore: string;
}

const parseMatchOutcome = (
  fact: CareerLedgerEntryV2,
  context: MatchContext,
): MatchOutcome | null => {
  const match = MATCH_SUMMARY.exec(fact.summary);
  if (!match) return null;
  const ownScore = context.isHome ? match[2]! : match[3]!;
  const opponentScore = context.isHome ? match[3]! : match[2]!;
  const own = Number(ownScore);
  const opponent = Number(opponentScore);
  const result: MatchResult = own > opponent ? 'win' : own === opponent ? 'draw' : 'loss';
  return { result, ownScore, opponentScore };
};

/** 从已结算的重要比赛事实构造位置专属关键时刻；普通比赛或不出场返回 null。 */
export const buildMatchMomentEvent = (
  save: CareerSaveV2Like,
  fact: CareerLedgerEntryV2,
): YouthEventInstance | null => {
  if (fact.type !== 'match' && fact.type !== 'pro-match') return null;
  const context = fact.matchContext;
  if (!context || !context.played || context.minutesPlayed <= 0) return null;
  if (!isImportantMatchContext(context)) return null;
  const outcome = parseMatchOutcome(fact, context);
  if (outcome === null) return null;

  const position = save.player.identity.primaryPosition as Position;
  const intents = POSITION_INTENTS[position] ?? POSITION_INTENTS.MIDFIELDER;
  const positionLabel = POSITION_LABELS[position] ?? '中场';
  const match = MATCH_SUMMARY.exec(fact.summary);
  const opponentName = match?.[1]?.trim() ?? '对手';

  return {
    eventId: `match-moment-${fact.id}`.slice(0, 60),
    title: `关键时刻 · 对阵${opponentName}`,
    description: `这是属于${positionLabel}的关键节点。对阵${opponentName}，比分 ${outcome.ownScore}:${outcome.opponentScore}，${RESULT_TEXT[outcome.result]}。你已经登场 ${context.minutesPlayed} 分钟，体能与专注都到了考验的时刻。选择你此刻的行动意图——结果由能力、状态和临场发挥共同决定，失败也会成为故事的一部分。`,
    choices: intents.map(({ id, text, riskLabel, effects, resolution, response, followUp }) => ({
      id,
      text,
      riskLabel,
      effects,
      resolution,
      response,
      followUp,
    })),
    resolvedChoiceId: null,
    participantIds: [],
    factRefs: [fact.id],
    storyId: 'match-moment',
    nextEventIds: [],
    interaction: 'decision',
  };
};

const SUPPRESSION_SEED_OFFSET = 9100;
const GENERATION_PROBABILITY = 0.5;

const hashText = (text: string): number => {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 2147483647;
  }
  return hash;
};

export interface MatchMomentPickResult<S = CareerSaveV2Like> {
  save: S;
  event: YouthEventInstance;
}

/**
 * 扫描本周比赛事实，从重要比赛中抽取一个交互关键时刻。
 * 抑制概率由种子与比赛事实地址派生：同种子同事实判定一致，读档重入不漂移，也不消费主随机序列。
 */
export const pickMatchMomentForWeek = <S extends CareerSaveV2Like>(
  save: S,
  facts: readonly CareerLedgerEntryV2[],
): MatchMomentPickResult<S> | null => {
  // 关键时刻占用月度交互名额，与事件共用"每月最多 2 个"上限。
  if ((save.monthlyAdvance.interactiveEventCount ?? 0) >= 2) return null;
  for (const fact of facts) {
    if (fact.type !== 'match' && fact.type !== 'pro-match') continue;
    const event = buildMatchMomentEvent(save, fact);
    if (!event) continue;
    const gateRng = createSeededRandomSource(
      save.randomState.seed + SUPPRESSION_SEED_OFFSET + hashText(`${fact.weekKey}:${fact.id}`),
    );
    if (gateRng.next() >= GENERATION_PROBABILITY) continue;
    return {
      save: {
        ...save,
        story: { ...save.story, pendingEvent: event },
        monthlyAdvance: {
          ...save.monthlyAdvance,
          status: 'awaiting-decision',
        },
      },
      event,
    };
  }
  return null;
};
