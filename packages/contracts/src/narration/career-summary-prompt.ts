import {
  CAREER_SUMMARY_PROMPT_VERSION,
  CareerSummaryFactsSchema,
  type CareerSummaryFacts,
  type CareerSummaryMode,
} from '../narration';

/** 将已校验的生涯事实包转换为 provider 可读的版本化提示。 */
export const buildCareerSummaryPrompt = (
  facts: CareerSummaryFacts,
  mode: CareerSummaryMode,
): string => {
  const safeFacts = CareerSummaryFactsSchema.parse(facts);
  const target = mode === 'short' ? '150-250 字' : '400-800 字';
  return [
    'promptVersion: ' + CAREER_SUMMARY_PROMPT_VERSION,
    '任务：根据事实包写一段中文生涯总结。',
    '模式：' + mode + '；目标长度：' + target + '。',
    '只允许复述事实包中的身份、履历、数字、节点、荣誉和评价；不得补写不存在的国家队经历、荣誉、人物或比赛结果。',
    '事实检查：逐项核对数字、俱乐部、年龄、赛季、伤病；缺失字段保持空白，任何数字不得改写或推算。',
    '事实包：' + JSON.stringify(safeFacts),
  ].join('\n');
};
