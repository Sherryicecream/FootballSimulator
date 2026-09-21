export interface CareerFact {
  kind?: string;
  category?: string;
  type?: string;
  label?: string;
  value?: string | number | boolean | null;
}

export interface CareerFactBag {
  honours?: readonly unknown[];
  appearances?: number;
  currentClub?: string | null;
  clubs?: number | readonly unknown[];
  seasons?: number;
  age?: number;
  injuryType?: string | null;
  durationWeeks?: number;
  returnOutcome?: string | null;
  totals?: { appearances?: number };
  careerOverview?: { appearances?: number; seasons?: number };
  clubHistory?: readonly { clubName?: string }[];
  fromClub?: string;
  toClub?: string;
}

interface NormalizedCareerFacts {
  honours: Array<{ kind: string; label: string }>;
  appearances?: number | undefined;
  currentClub?: string | undefined;
  seasons?: number | undefined;
  age?: number | undefined;
  injuryType?: string | undefined;
  durationWeeks?: number | undefined;
  returnOutcome?: string | undefined;
}

const HONOUR_CLAIMS = [
  { token: '世界杯', pattern: /世界杯冠军|世界杯夺冠/, kinds: ['world-cup-champion'] },
  { token: '世界杯', pattern: /世界杯亚军/, kinds: ['world-cup-runner-up'] },
  { token: '亚洲杯', pattern: /亚洲杯冠军|亚洲杯夺冠/, kinds: ['asian-cup-champion'] },
  { token: '联赛冠军', pattern: /联赛冠军|联赛夺冠/, kinds: ['league-champion'] },
  { token: '杯赛冠军', pattern: /杯赛冠军|杯赛夺冠/, kinds: ['cup-champion'] },
  { token: '升级', pattern: /升级成功|成功升级/, kinds: ['promotion'] },
  { token: '降级', pattern: /降级/, kinds: ['relegation'] },
] as const;

type NormalizedHonour = NormalizedCareerFacts['honours'][number];

const toText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readHonour = (value: unknown): NormalizedHonour[] => {
  if (typeof value === 'string') return [{ kind: value, label: value }];
  if (!value || typeof value !== 'object') return [];
  const item = value as Record<string, unknown>;
  const kind = toText(item.kind) ?? '';
  const label = toText(item.label) ?? kind;
  return kind || label ? [{ kind, label }] : [];
};

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normalizeFacts = (facts: CareerFactBag | readonly CareerFact[]): NormalizedCareerFacts => {
  if (Array.isArray(facts)) {
    const normalized: NormalizedCareerFacts = { honours: [] };
    for (const fact of facts) {
      const kind = fact.kind ?? fact.category ?? fact.type;
      const value = fact.value ?? fact.label;
      if (kind === 'honour' || kind === 'honours') {
        const text = toText(value);
        if (text) normalized.honours.push({ kind: text, label: text });
      } else if (kind === 'appearances') {
        normalized.appearances = readNumber(value);
      } else if (kind === 'current-club' || kind === 'club') {
        const text = toText(value);
        if (text) normalized.currentClub = text;
      } else if (kind === 'seasons') {
        normalized.seasons = readNumber(value);
      } else if (kind === 'age') {
        normalized.age = readNumber(value);
      } else if (kind === 'injury' || kind === 'injury-type') {
        const text = toText(value);
        if (text) normalized.injuryType = text;
      } else if (kind === 'injury-duration') {
        normalized.durationWeeks = readNumber(value);
      }
    }
    return normalized;
  }

  const source = facts as CareerFactBag;
  const honours = (source.honours ?? []).flatMap(readHonour);
  const clubHistory = source.clubHistory ?? [];
  const currentClub =
    toText(source.currentClub) ??
    toText(source.toClub) ??
    toText(clubHistory.at(-1)?.clubName) ??
    undefined;
  const careerOverview = source.careerOverview;
  const totals = source.totals;
  return {
    honours,
    appearances:
      readNumber(source.appearances) ??
      readNumber(totals?.appearances) ??
      readNumber(careerOverview?.appearances),
    currentClub,
    seasons: readNumber(source.seasons) ?? readNumber(careerOverview?.seasons),
    age: readNumber(source.age),
    injuryType: toText(source.injuryType) ?? undefined,
    durationWeeks: readNumber(source.durationWeeks),
    returnOutcome: toText(source.returnOutcome) ?? undefined,
  };
};

const hasHonourKind = (honours: readonly NormalizedHonour[], kinds: readonly string[]): boolean =>
  honours.some((honour) => kinds.includes(honour.kind));

const honourTextIsPresent = (honours: readonly NormalizedHonour[], output: string): boolean =>
  honours.some((honour) =>
    [honour.kind, honour.label].some((text) => text.length > 1 && output.includes(text)),
  );

const hasPositiveHonourClaim = (output: string): boolean =>
  /(?:赢得|获得|夺得|捧起|拿下|加冕|荣获).{0,12}(?:冠军|亚军|奖杯|奖牌|荣誉)/.test(output);

const hasGenericHonourSupport = (
  claim: string,
  output: string,
  honours: readonly NormalizedHonour[],
): boolean => {
  if (honourTextIsPresent(honours, output)) return true;
  if (claim.includes('冠军')) {
    return honours.some(
      (honour) => honour.kind.includes('champion') || honour.label.includes('冠军'),
    );
  }
  return false;
};

const extractCounts = (output: string, pattern: RegExp): number[] =>
  [...output.matchAll(pattern)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));

const materiallyDifferent = (expected: number, actual: number): boolean => {
  const difference = Math.abs(expected - actual);
  if (difference > 2) return true;
  return expected > 0 && difference / expected >= 0.2;
};

const addCountContradiction = (
  errors: string[],
  output: string,
  expected: number | undefined,
  pattern: RegExp,
  label: string,
): void => {
  if (expected === undefined) return;
  for (const actual of extractCounts(output, pattern)) {
    if (materiallyDifferent(expected, actual)) errors.push(label);
  }
};

const normalizeClubName = (club: string): string =>
  club
    .replace(/\s+/g, '')
    .replace(/(?:足球俱乐部|足球队|俱乐部|队|FC)$/i, '')
    .toLocaleLowerCase();

const extractClubMentions = (output: string): string[] =>
  [
    ...output.matchAll(
      /(?:目前|当前|现阶段)\s*(?:效力于|效力|所在俱乐部是)\s*([\u4e00-\u9fffA-Za-z0-9·-]{2,30})/g,
    ),
    ...output.matchAll(
      /(?:加盟|签约|转会至|转投|下一站(?:是|为)?)\s*([\u4e00-\u9fffA-Za-z0-9·-]{2,30})/g,
    ),
  ].map((match) => normalizeClubName(match[1]!));

const injuryKeywords = ['轻度', '轻微', '轻伤', '重伤', '严重', '扭伤', '拉伤', '骨折', '韧带'];

const detectInjuryContradiction = (
  errors: string[],
  output: string,
  facts: NormalizedCareerFacts,
): void => {
  if (!facts.injuryType) return;
  const expectedKeywords = injuryKeywords.filter((keyword) => facts.injuryType!.includes(keyword));
  const outputKeywords = injuryKeywords.filter((keyword) => output.includes(keyword));
  if (outputKeywords.some((keyword) => !expectedKeywords.includes(keyword))) {
    errors.push('伤病类型');
  }
  addCountContradiction(
    errors,
    output,
    facts.durationWeeks,
    /(?:休战|伤缺|持续|恢复期|康复)\s*(\d+)\s*周/g,
    '伤病时长',
  );
  if (
    facts.returnOutcome === 'fully-recovered' &&
    /职业生涯结束|无法复出|仍未恢复|部分恢复/.test(output)
  ) {
    errors.push('复出结果');
  }
  if (facts.returnOutcome === 'career-ending' && /完全康复|彻底恢复|重返赛场/.test(output)) {
    errors.push('复出结果');
  }
};

export const detectFactualContradiction = (
  output: string,
  facts: CareerFactBag | readonly CareerFact[],
): string[] => {
  const normalized = normalizeFacts(facts);
  const errors: string[] = [];
  for (const claim of HONOUR_CLAIMS) {
    if (claim.pattern.test(output) && !hasHonourKind(normalized.honours, claim.kinds)) {
      errors.push(claim.token);
    }
  }
  if (normalized.honours.length === 0 && hasPositiveHonourClaim(output)) {
    errors.push('荣誉');
  } else if (normalized.honours.length > 0) {
    for (const match of output.matchAll(
      /(?:赢得|获得|夺得|捧起|拿下|加冕|荣获).{0,12}(?:冠军|亚军|奖杯|奖牌|荣誉|金靴|最佳球员|最佳射手)/g,
    )) {
      if (!hasGenericHonourSupport(match[0]!, output, normalized.honours)) {
        errors.push('荣誉');
      }
    }
  }
  addCountContradiction(
    errors,
    output,
    normalized.appearances,
    /(?:出场|登场|上阵|出赛)\s*(\d+)/g,
    '出场',
  );
  addCountContradiction(errors, output, normalized.seasons, /(\d+)\s*个赛季/g, '赛季');
  addCountContradiction(
    errors,
    output,
    normalized.age,
    /(?:现年|年龄|年满)\s*(\d+)\s*岁?/g,
    '年龄',
  );
  if (normalized.currentClub) {
    const expectedClub = normalizeClubName(normalized.currentClub);
    for (const club of extractClubMentions(output)) {
      if (club !== expectedClub) errors.push('俱乐部');
    }
  }
  detectInjuryContradiction(errors, output, normalized);
  return [...new Set(errors)];
};
