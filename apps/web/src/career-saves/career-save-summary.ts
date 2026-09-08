import type { CareerPhase, CareerSaveV6 } from '@football/contracts';
import type { LoadedCareerSlot } from '../persistence/local-storage-save';

export interface CareerSaveSummary {
  slotId: string;
  playerName: string;
  age: number;
  location: string;
  phaseLabel: string;
  currentDate: string;
  savedAt: string;
  terminal: boolean;
}

const PHASE_LABELS: Record<CareerPhase, string> = {
  'youth-season': '青训赛季',
  offseason: '休赛期',
  'agent-preferences': '经纪人偏好',
  'offer-review': '报价审阅',
  'professional-contract': '职业合同期',
  'pro-season': '职业赛季',
  'pro-offseason': '职业休赛期',
  'free-agent': '自由球员市场',
  retired: '生涯回顾',
};

const TERMINAL_LABELS = {
  'youth-no-contract': '青训生涯结束',
  'voluntary-retirement': '主动退役',
  'market-exit': '离开职业足坛',
} as const;

const terminalLabelFor = (save: CareerSaveV6): string =>
  save.careerEnd ? TERMINAL_LABELS[save.careerEnd.kind] : '生涯已结束';

const locationFor = (save: CareerSaveV6, academyNames: ReadonlyMap<string, string>): string => {
  if (save.careerPhase === 'retired') return terminalLabelFor(save);
  if (save.activeLoan) return save.activeLoan.loanClubName;
  if (save.contract) return save.contract.clubName;
  return academyNames.get(save.season.academyId) ?? '尚未选择球队';
};

export const buildCareerSaveSummary = (
  record: LoadedCareerSlot,
  academyNames: ReadonlyMap<string, string>,
): CareerSaveSummary => {
  const { save } = record;
  return {
    slotId: record.slotId,
    playerName: save.player.identity.name,
    age: save.player.age,
    location: locationFor(save, academyNames),
    phaseLabel: PHASE_LABELS[save.careerPhase],
    currentDate:
      save.proSeason?.currentDate ?? save.offseason?.nextSeasonStart ?? save.season.currentDate,
    savedAt: record.savedAt,
    terminal: save.careerPhase === 'retired',
  };
};
