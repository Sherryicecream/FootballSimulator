import { MilestoneInputSchema, type MilestoneInput } from './milestone-narration';

const scenarioHeading = (input: MilestoneInput): string => {
  switch (input.kind) {
    case 'first-contract':
      return '首份职业合同';
    case 'injury-return':
      return '重大伤病与复出';
    case 'key-transfer':
      return '关键转会与留洋';
    case 'national-team':
      return '国家队重大节点';
    case 'retirement':
      return '退役总结';
  }
};

const scenarioInstructions = (input: MilestoneInput): string => {
  switch (input.kind) {
    case 'first-contract':
      return '说明首份合同如何把早期选择连接到职业道路；合同年限、薪资、转会费和俱乐部承诺只在事实包提供时提及。';
    case 'injury-return':
      return '说明伤病、恢复中的选择和复出结果如何改变后续道路；不得把轻伤写成重伤，也不得虚构恢复结果。';
    case 'key-transfer':
      return '说明转会决定、适应过程和新的环境如何影响职业道路；转会费只能写事实包给出的范围。';
    case 'national-team':
      return '说明国家队比赛、真实出场与进球以及淘汰轮次如何成为生涯节点；不得补写未提供的赛事荣誉。';
    case 'retirement':
      return '从生涯总览、荣誉、关键数据、独特比赛、遗憾和最大成就中，解释为什么这是这名球员的故事；不得与事实包冲突。';
  }
};

/** 为五类关键节点提供独立、可审计的事实提示词。 */
export const buildMilestonePrompt = (input: MilestoneInput): string => {
  const safeInput = MilestoneInputSchema.parse(input);
  return [
    'promptVersion: milestone-narration-v1',
    '场景：' + scenarioHeading(safeInput),
    '任务：写一段 150-250 字的中文“为什么这是你的故事”评价。',
    '要求：' + scenarioInstructions(safeInput),
    '只能使用事实包中的身份、选择、结果、荣誉、关键数据和独特比赛数据；没有提供的事实必须保持空白。',
    '把早期选择与后来结果连起来，但不要创造新的冠军、进球、出场、关系、伤病因果、日期或转会金额。',
    '事实检查：逐项核对数字、俱乐部、年龄、赛季、伤病；缺失字段保持空白，任何数字不得改写或推算。',
    '事实包：' + JSON.stringify(safeInput),
  ].join('\n');
};
