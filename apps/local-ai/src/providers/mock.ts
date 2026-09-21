import type { NarrativeProvider } from './types';

export const createDeterministicMockProvider = (): NarrativeProvider => ({
  generate: async (request) => {
    if (request.kind === 'career-summary') {
      return {
        summary:
          request.mode === 'short'
            ? '这是一段由事实包守护的生涯总结。'.repeat(10)
            : '这是一段由事实包守护的生涯总结，所有数字与经历都来自已结算档案。'.repeat(20),
      };
    }
    if (request.kind === 'milestone') {
      const input = request.input;
      const detail =
        input.kind === 'injury-return'
          ? '伤病持续 ' + input.durationWeeks + ' 周，复出结果为 ' + input.returnOutcome + '。'
          : input.kind === 'first-contract'
            ? '首份职业合同来自 ' + input.club + '，期限 ' + input.contractYears + ' 年。'
            : input.kind === 'key-transfer'
              ? '这次转会连接了 ' + input.fromClub + ' 与 ' + input.toClub + '。'
              : input.kind === 'national-team'
                ? '国家队节点记录了 ' + input.appearances + ' 次出场和 ' + input.goals + ' 个进球。'
                : '生涯总览记录了 ' +
                  input.careerOverview.appearances +
                  ' 次出场和 ' +
                  input.careerOverview.goals +
                  ' 个进球。';
      let narrative =
        input.playerName +
        '的这个节点不是孤立的结果：' +
        detail +
        '荣誉、关键数据和独特比赛记录都只按事实包组织，早期选择与后来结果在这里彼此照见。';
      while (narrative.length < 150) narrative += '这段评价只复述已经发生的经历。';
      return { narrative: narrative.slice(0, 250) };
    }
    const { draft } = request;
    return {
      response:
        draft.response.length <= 460
          ? draft.response + ' 场边的空气慢慢安静下来。'
          : draft.response,
      participantResponses: draft.participantResponses.map(({ personId, text }) => ({
        personId,
        text,
      })),
      followUp: draft.followUp,
    };
  },
});
