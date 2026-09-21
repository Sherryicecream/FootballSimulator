import {
  advanceCareerMonth,
  advanceProMonth,
  canContinueYouthSeason,
  clearEventFeedback,
  completeProfessionalSeason,
  completeYouthSeason,
  createCareerSave,
  createYouthCareerV2,
  enterOffseason,
  generateContractOffers,
  signContract,
  startNextYouthSeason,
  startProfessionalSeason,
  submitAgentPreferences,
  submitCareerDecision,
} from '../../../../packages/application/src';
import { getYouthContent } from '../../../../packages/content/src';
import {
  CareerSaveV6Schema,
  migrateCareerSaveV6,
  type CareerSaveV6,
} from '../../../../packages/contracts/src';

const content = getYouthContent();

const createYouthSave = (playerName: string, seed: number) =>
  createYouthCareerV2(
    createCareerSave({
      playerName,
      hometown: '上海',
      primaryPosition: 'FORWARD',
      preferredFoot: 'RIGHT',
      regionId: 'shanghai',
      seed,
    }),
    content,
  );

const asV6 = (save: unknown): CareerSaveV6 => {
  if (save && typeof save === 'object' && 'schemaVersion' in save) {
    const record = save as Record<string, unknown>;
    if (record.schemaVersion === 7 || record.schemaVersion === 8) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mechanicsVersion, moments, worldRegistry, ...v6like } = record;
      return CareerSaveV6Schema.parse({ ...v6like, schemaVersion: 6 });
    }
  }
  return CareerSaveV6Schema.parse(migrateCareerSaveV6(save));
};

const submitDecision = <S extends Parameters<typeof submitCareerDecision>[0]>(save: S) => {
  const event = save.story.pendingEvent;
  if (!event) throw new Error('夹具预期存在待处理事件');
  return submitCareerDecision(save, event.eventId, event.choices[0]!.id);
};

const clearDecision = <S extends Parameters<typeof submitCareerDecision>[0]>(save: S) =>
  clearEventFeedback(submitDecision(save));

const settleYouthMonth = <S extends Parameters<typeof advanceCareerMonth>[0]>(save: S) => {
  const outcome = advanceCareerMonth(save, content.academies, content.events);
  return outcome.status === 'awaiting-decision' ? clearDecision(outcome.save) : outcome.save;
};

const finalYouthOffseason = (playerName: string, seed: number) => {
  let save = createYouthSave(playerName, seed);
  for (let season = 0; season < 8; season += 1) {
    for (let month = 0; !save.season.completed && month < 40; month += 1) {
      save = settleYouthMonth(save);
    }
    if (!save.season.completed) throw new Error('青训赛季未在保护步数内完成');
    save = enterOffseason(completeYouthSeason(save).save, content.academies).save;
    if (!canContinueYouthSeason(save)) return save;
    save = startNextYouthSeason(save, content);
  }
  throw new Error('青训年龄窗口未在保护赛季数内耗尽');
};

let failedFinalYouth: CareerSaveV6 | undefined;
export const failedFinalYouthOffseasonV6 = (): CareerSaveV6 => {
  failedFinalYouth ??= asV6(finalYouthOffseason('林岳', 101));
  return asV6(failedFinalYouth);
};

export const firstCareerV6 = (): CareerSaveV6 => asV6(createYouthSave('林岳', 102));

export const secondCareerV6 = (): CareerSaveV6 => asV6(createYouthSave('周川', 122));

let professionalOffseason: CareerSaveV6 | undefined;
export const age22ProfessionalOffseasonV6 = (): CareerSaveV6 => {
  if (professionalOffseason) return asV6(professionalOffseason);

  let save = finalYouthOffseason('陈锋', 122);
  if (!save.offseason?.graduationEligible) throw new Error('职业夹具预期通过毕业评估');
  save = submitAgentPreferences(save, { leagueTierBias: 'balanced', priority: 'playing-time' });
  save = generateContractOffers(save, content);
  if (save.pendingOffers.length === 0) throw new Error('职业夹具预期获得至少一份合同报价');
  save = signContract(save, save.pendingOffers[0]!.id);
  let professional = startProfessionalSeason(save, content.clubs);
  for (let season = 0; season < 5; season += 1) {
    for (let month = 0; !professional.proSeason?.completed && month < 40; month += 1) {
      const outcome = advanceProMonth(professional, content.clubs, content.events);
      professional =
        outcome.status === 'awaiting-decision' ? clearDecision(outcome.save) : outcome.save;
    }
    if (!professional.proSeason?.completed) throw new Error('职业赛季未在保护步数内完成');
    const settled = completeProfessionalSeason(professional).save;
    professional = settled.story.pendingEvent ? clearDecision(settled) : settled;
    if (professional.player.age === 22) {
      professionalOffseason = asV6(professional);
      return asV6(professionalOffseason);
    }
    professional = startProfessionalSeason(professional, content.clubs);
  }
  throw new Error('职业夹具未通过公开流程到达 22 岁休赛期');
};

export const pendingEventV6 = (): CareerSaveV6 => {
  return asV6(pendingEvent());
};

const pendingEvent = () => {
  let save = createYouthSave('事件恢复', 101);
  for (let month = 0; month < 40; month += 1) {
    const outcome = advanceCareerMonth(save, content.academies, content.events);
    save = outcome.save;
    if (outcome.status === 'awaiting-decision') return save;
  }
  throw new Error('夹具未在保护步数内产生待处理事件');
};

export const pendingFeedbackV6 = (): CareerSaveV6 => asV6(submitDecision(pendingEvent()));
