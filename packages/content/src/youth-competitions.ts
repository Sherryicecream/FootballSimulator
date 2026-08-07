import type { YouthCompetitionDefinition } from '@football/contracts';

export const youthCompetitions: YouthCompetitionDefinition[] = [
  {
    id: 'national-youth-development-league',
    name: '全国青年发展联赛',
    participatingAcademyIds: [
      'shanghai-pujiang',
      'shanghai-shencheng',
      'shandong-qilu',
      'jiangsu-jiangnan',
      'guangdong-nanling',
      'guangdong-yangcheng',
      'beijing-jinghua',
      'sichuan-bashu',
      'dongbei-beijing',
      '校园-上海',
      '校园-北京',
      '校园-全国',
      'relocation-qilu',
      'relocation-nanling',
      'relocation-pujiang',
    ],
    seasonStartMonth: 9,
    seasonEndMonth: 6,
    targetFixtureCount: { min: 18, max: 26 },
  },
];
