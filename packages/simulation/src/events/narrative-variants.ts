import type { EventChoiceNarrativeVariant } from '@football/contracts';

export interface NarrativeVariantKey {
  seed: number;
  eventId: string;
  choiceId: string;
}

export interface SelectedNarrativeVariant {
  index: number;
  variant: EventChoiceNarrativeVariant;
}

/**
 * 选择内容包已经写好的整组对话，不消耗比赛/成长随机游标。
 * 同一生涯种子、事件和选项在刷新或重放时始终得到同一组文案。
 */
export const selectEventNarrativeVariant = (
  variants: readonly EventChoiceNarrativeVariant[],
  key: NarrativeVariantKey,
): SelectedNarrativeVariant => {
  if (variants.length === 0) throw new Error('对话变体不能为空');
  const hash = hashNarrativeKey(`${key.seed}:${key.eventId}:${key.choiceId}`);
  const index = hash % variants.length;
  return { index, variant: variants[index]! };
};

const hashNarrativeKey = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
