import type {
  CareerSummaryOutput,
  CareerSummaryRequest,
  MilestoneNarrationOutput,
  MilestoneNarrationRequest,
  NarrativePolishOutput,
  NarrativePolishRequest,
} from '@football/contracts';

const extractNumbers = (texts: readonly string[]): string[] =>
  texts.flatMap((text) => text.match(/\d+(?:\.\d+)?/g) ?? []);

const textFields = (request: NarrativePolishRequest): string[] => [
  request.context.eventTitle,
  request.context.choiceText,
  request.context.playerName,
  ...request.context.participantNames,
  request.draft.response,
  request.draft.followUp,
  ...request.draft.participantResponses.map(({ text }) => text),
];

const outputTexts = (output: NarrativePolishOutput): string[] => [
  output.response,
  output.followUp,
  ...output.participantResponses.map(({ text }) => text),
];

export class UnsafeNarrativeOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeNarrativeOutputError';
  }
}

export const fallbackNarrativeDraft = (request: NarrativePolishRequest): NarrativePolishOutput => ({
  response: request.draft.response,
  participantResponses: request.draft.participantResponses.map(({ personId, text }) => ({
    personId,
    text,
  })),
  followUp: request.draft.followUp,
});

export const validateNarrativePolishOutput = (
  request: NarrativePolishRequest,
  output: NarrativePolishOutput,
): NarrativePolishOutput => {
  const expectedIds = request.draft.participantResponses.map(({ personId }) => personId);
  const outputIds = output.participantResponses.map(({ personId }) => personId);
  if (expectedIds.join('|') !== outputIds.join('|')) {
    throw new UnsafeNarrativeOutputError('叙事输出修改了参与人物');
  }

  const allowedNumbers = new Set(extractNumbers(textFields(request)));
  const introducedNumbers = extractNumbers(outputTexts(output)).filter(
    (token) => !allowedNumbers.has(token),
  );
  if (introducedNumbers.length > 0) {
    throw new UnsafeNarrativeOutputError('叙事输出引入了未经事实包允许的数字');
  }

  if (outputTexts(output).some((text) => /[<>]/.test(text))) {
    throw new UnsafeNarrativeOutputError('叙事输出包含未允许的标记');
  }

  return output;
};

export const fallbackCareerSummary = (request: CareerSummaryRequest): CareerSummaryOutput => {
  const facts = request.facts;
  const national =
    facts.nationalTeam.capped === false
      ? '未入选国家队，没有国家队出场和进球记录。'
      : '国家队出场 ' + facts.nationalTeam.caps + ' 次，进球 ' + facts.nationalTeam.goals + ' 个。';
  const honour =
    facts.honours.length > 0
      ? '已记录荣誉：' + facts.honours.map(({ label }) => label).join('、') + '。'
      : '没有记录在案的生涯荣誉。';
  const moment =
    facts.keyMoments[0]?.summary ?? '没有记录在案的关键转折点，服务端不对空白进行推断。';
  const base =
    facts.player.name +
    '的' +
    facts.tierLabel +
    '共包含 ' +
    facts.seasons +
    ' 个赛季，累计出场 ' +
    facts.totals.appearances +
    ' 次、进球 ' +
    facts.totals.goals +
    ' 个、助攻 ' +
    facts.totals.assists +
    ' 次。' +
    moment +
    national +
    honour +
    '这段文字只复述已结算事实，不新增荣誉、国家队经历、人物关系或比赛结果。';
  const padding = '每一个数字都来自事实包，每一个空白都被保留下来。';
  let summary = base;
  while (summary.length < (request.mode === 'short' ? 150 : 400)) summary += padding;
  return { summary: summary.slice(0, request.mode === 'short' ? 250 : 800) };
};

export const validateCareerSummaryOutput = (
  request: CareerSummaryRequest,
  output: CareerSummaryOutput,
): CareerSummaryOutput => {
  const text = output.summary;
  const allowedNumbers = new Set(extractNumbers([JSON.stringify(request.facts)]));
  const introducedNumbers = extractNumbers([text]).filter((token) => !allowedNumbers.has(token));
  if (introducedNumbers.length > 0) {
    throw new UnsafeNarrativeOutputError('生涯总结引入了未经事实包允许的数字');
  }
  if (/[<>]/.test(text)) {
    throw new UnsafeNarrativeOutputError('生涯总结包含未允许的标记');
  }
  validateHonourClaims(request.facts.honours, text, '生涯总结引入了事实包之外的荣誉');
  if (
    !request.facts.nationalTeam.capped &&
    /(代表国家队|国家队出场|国家队进球|参加世界杯|参加亚洲杯|成为国脚)/.test(text)
  ) {
    throw new UnsafeNarrativeOutputError('生涯总结引入了不存在的国家队经历');
  }
  if (request.mode === 'short' && (text.length < 150 || text.length > 250)) {
    throw new UnsafeNarrativeOutputError('短版生涯总结字数不符合契约');
  }
  if (request.mode === 'long' && (text.length < 400 || text.length > 800)) {
    throw new UnsafeNarrativeOutputError('长版生涯总结字数不符合契约');
  }
  return output;
};

const milestoneFactsText = (request: MilestoneNarrationRequest): string => {
  const input = request.input;
  const honours =
    input.honours.length > 0
      ? '荣誉包括 ' + input.honours.map(({ label }) => label).join('、') + '。'
      : '没有记录在案的荣誉。';
  const stats =
    input.keyStats.length > 0
      ? '关键数据为 ' +
        input.keyStats.map(({ label, value, unit }) => label + value + unit).join('、') +
        '。'
      : '没有额外关键数据。';
  const matches =
    input.signatureMatches.length > 0
      ? '独特比赛记录包括：' +
        input.signatureMatches
          .map(
            ({ competition, opponent, result, playerGoals, playerAssists, highlight }) =>
              competition +
              '对阵' +
              opponent +
              '（' +
              result +
              '，个人进球 ' +
              playerGoals +
              '，助攻 ' +
              playerAssists +
              '）：' +
              highlight,
          )
          .join('；') +
        '。'
      : '没有额外独特比赛记录。';
  return honours + stats + matches;
};

const milestoneScenarioText = (request: MilestoneNarrationRequest): string => {
  const input = request.input;
  switch (input.kind) {
    case 'first-contract':
      return (
        input.playerName +
        '在' +
        input.club +
        '签下首份职业合同，期限 ' +
        input.contractYears +
        ' 年，年薪 ' +
        input.annualSalary +
        '。' +
        (input.transferFee === null
          ? '没有记录转会费。'
          : '记录转会费 ' + input.transferFee + '。') +
        (input.clubPromise === null ? '' : '俱乐部承诺：' + input.clubPromise + '。')
      );
    case 'injury-return':
      return (
        input.playerName +
        '经历' +
        input.injuryType +
        '，持续 ' +
        input.durationWeeks +
        ' 周；恢复期选择：' +
        (input.recoveryChoices.join('、') || '没有额外选择记录') +
        '；复出结果为 ' +
        input.returnOutcome +
        '。'
      );
    case 'key-transfer':
      return (
        input.playerName +
        '从' +
        input.fromClub +
        '转到' +
        input.toClub +
        '；转会费范围为 ' +
        (input.transferFeeRange
          ? input.transferFeeRange.minimum +
            '-' +
            input.transferFeeRange.maximum +
            input.transferFeeRange.currency
          : '没有记录') +
        '；适应变化：' +
        input.adaptationStatusChange +
        '。'
      );
    case 'national-team':
      return (
        input.playerName +
        '在' +
        input.competitionType +
        (input.competitionName === null ? '' : '（' + input.competitionName + '）') +
        '出场 ' +
        input.appearances +
        ' 次，进球 ' +
        input.goals +
        ' 个；淘汰轮次：' +
        (input.knockoutRound ?? '没有记录') +
        '。'
      );
    case 'retirement':
      return (
        input.playerName +
        '结束了包含 ' +
        input.careerOverview.seasons +
        ' 个赛季、' +
        input.careerOverview.clubs +
        ' 家俱乐部、出场 ' +
        input.careerOverview.appearances +
        ' 次、进球 ' +
        input.careerOverview.goals +
        ' 个的生涯。' +
        (input.biggestAchievement === null
          ? ''
          : '最大成就是：' + input.biggestAchievement + '。') +
        (input.regret === null ? '' : '遗憾是：' + input.regret + '。')
      );
  }
};

export const fallbackMilestoneNarration = (
  request: MilestoneNarrationRequest,
): MilestoneNarrationOutput => {
  const base =
    milestoneScenarioText(request) +
    milestoneFactsText(request) +
    '这个节点之所以重要，是因为早期选择留下了可追溯的方向，并在后来结果中形成了回声。' +
    '这段评价只复述已提供的事实，不新增荣誉、进球、出场、关系、伤病因果或转会金额。';
  const padding = '记录中的空白仍然保持为空白。';
  let narrative = base;
  while (narrative.length < 150) narrative += padding;
  return { narrative: narrative.slice(0, 250) };
};

const HONOUR_CLAIMS = [
  { pattern: /世界杯冠军|世界杯夺冠/, kinds: ['world-cup-champion'] },
  { pattern: /世界杯亚军/, kinds: ['world-cup-runner-up'] },
  { pattern: /亚洲杯冠军|亚洲杯夺冠/, kinds: ['asian-cup-champion'] },
  { pattern: /联赛冠军|联赛夺冠/, kinds: ['league-champion'] },
  { pattern: /杯赛冠军|杯赛夺冠/, kinds: ['cup-champion'] },
  { pattern: /升级成功|成功升级/, kinds: ['promotion'] },
  { pattern: /降级/, kinds: ['relegation'] },
] as const;

const GENERIC_HONOUR_CLAIM =
  /(?:赢得|获得|夺得|捧起|拿下|加冕|荣获).{0,12}(?:冠军|亚军|奖杯|奖牌|荣誉|金靴|最佳球员|最佳射手)/g;

const validateHonourClaims = (
  honours: readonly { kind: string; label: string }[],
  text: string,
  message: string,
): void => {
  const actualHonourKinds = new Set(honours.map(({ kind }) => kind));
  for (const claim of HONOUR_CLAIMS) {
    if (
      claim.pattern.test(text) &&
      !claim.kinds.some((kind) => actualHonourKinds.has(kind)) &&
      !honours.some(({ label }) => claim.pattern.test(label))
    ) {
      throw new UnsafeNarrativeOutputError(message);
    }
  }
  if (honours.length === 0 && [...text.matchAll(GENERIC_HONOUR_CLAIM)].length > 0) {
    throw new UnsafeNarrativeOutputError(message);
  }
  if (honours.length > 0) {
    for (const match of text.matchAll(GENERIC_HONOUR_CLAIM)) {
      const claim = match[0]!;
      const supported =
        honours.some(
          ({ kind, label }) =>
            (kind.length > 1 && text.includes(kind)) || (label.length > 1 && text.includes(label)),
        ) ||
        (claim.includes('冠军') &&
          honours.some(({ kind, label }) => kind.includes('champion') || label.includes('冠军')));
      if (!supported) throw new UnsafeNarrativeOutputError(message);
    }
  }
};

const validateMilestoneFactClaims = (request: MilestoneNarrationRequest, text: string): void => {
  const input = request.input;
  validateHonourClaims(input.honours, text, '关键节点评价引入了事实包之外的荣誉');
  if (
    input.signatureMatches.length === 0 &&
    /(?:打入|攻入|贡献|上演|完成).{0,12}(?:制胜球|帽子戏法|绝杀|决赛)/.test(text)
  ) {
    throw new UnsafeNarrativeOutputError('关键节点评价引入了事实包之外的比赛事实');
  }
  if (input.kind === 'national-team') {
    const competitionTerms = [input.competitionType, input.competitionName].filter(
      (term): term is string => Boolean(term),
    );
    for (const competition of ['世界杯', '亚洲杯']) {
      if (
        text.includes(competition) &&
        !competitionTerms.some((term) => term.includes(competition))
      ) {
        throw new UnsafeNarrativeOutputError('关键节点评价引入了事实包之外的国家队赛事');
      }
    }
  }
  if (input.kind === 'injury-return') {
    const forbiddenOutcomeClaims: Record<typeof input.returnOutcome, RegExp> = {
      'fully-recovered': /部分恢复|仍未恢复|职业生涯结束|无法复出/,
      'partial-recovery': /完全康复|彻底恢复/,
      'career-ending': /完全康复|彻底恢复|重返赛场/,
    };
    if (forbiddenOutcomeClaims[input.returnOutcome].test(text)) {
      throw new UnsafeNarrativeOutputError('关键节点评价改变了伤病结果');
    }
  }
};

export const validateMilestoneNarrationOutput = (
  request: MilestoneNarrationRequest,
  output: MilestoneNarrationOutput,
): MilestoneNarrationOutput => {
  const text = output.narrative;
  const allowedNumbers = new Set(extractNumbers([JSON.stringify(request.input)]));
  const introducedNumbers = extractNumbers([text]).filter((token) => !allowedNumbers.has(token));
  if (introducedNumbers.length > 0) {
    throw new UnsafeNarrativeOutputError('关键节点评价引入了未经事实包允许的数字');
  }
  if (/[<>]/.test(text)) {
    throw new UnsafeNarrativeOutputError('关键节点评价包含未允许的标记');
  }
  validateMilestoneFactClaims(request, text);
  if (text.length < 150 || text.length > 250) {
    throw new UnsafeNarrativeOutputError('关键节点评价字数不符合契约');
  }
  return output;
};
