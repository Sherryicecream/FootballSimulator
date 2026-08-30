import type { ClubProfile } from '@football/contracts';

/**
 * 虚构职业俱乐部内容：层级 1–10（本切面青训出身要约集中在 4–7 档），
 * 位置需求标注当前阵容缺口，青训周期影响对年轻球员的兴趣。
 */
export const youthClubs: ClubProfile[] = [
  club('shenhai-port', '申海港联', 8, 'shanghai', ['FORWARD', 'WINGER'], 'contending', 90),
  club('qilu-mountain', '泰岳山岳', 8, 'shandong', ['CENTER_BACK', 'MIDFIELDER'], 'contending', 88),
  club(
    'jingyan-united',
    '京燕联合',
    7,
    'beijing-tianjin',
    ['FULL_BACK', 'MIDFIELDER'],
    'stable',
    74,
  ),
  club('lingnan-city', '岭南城都', 7, 'guangdong', ['WINGER', 'FORWARD'], 'rebuilding', 70),
  club(
    'jiangnan-boats',
    '江南舟竞',
    6,
    'jiangsu-zhejiang',
    ['MIDFIELDER', 'FULL_BACK'],
    'stable',
    62,
  ),
  club(
    'shu-tianfu',
    '蜀中天府',
    6,
    'sichuan-chongqing',
    ['CENTER_BACK', 'FORWARD'],
    'rebuilding',
    55,
  ),
  club('xuefeng-north', '雪峰北境', 5, 'dongbei', ['FORWARD', 'CENTER_BACK'], 'rebuilding', 46),
  club('minjiang-fisher', '闽江渔火', 5, 'fujian', ['WINGER', 'MIDFIELDER'], 'stable', 44),
  club('yunmeng-lake', '云梦泽畔', 4, 'hubei-hunan', ['MIDFIELDER', 'FULL_BACK'], 'rebuilding', 36),
  club('zhongyuan-plains', '中原牧野', 4, 'henan', ['CENTER_BACK', 'WINGER'], 'stable', 34),
  club(
    'qinchuan-riders',
    '秦川铁骑',
    3,
    'shaanxi-gansu',
    ['FORWARD', 'MIDFIELDER'],
    'rebuilding',
    26,
  ),
  club(
    'tianshan-eagles',
    '天山雄鹰',
    3,
    'xinjiang',
    ['FULL_BACK', 'CENTER_BACK'],
    'rebuilding',
    22,
  ),
];

function club(
  id: string,
  name: string,
  tier: number,
  regionId: string,
  positionalNeeds: ClubProfile['positionalNeeds'],
  youthCycle: ClubProfile['youthCycle'],
  wageBudget: number,
): ClubProfile {
  return { id, name, tier, regionId, positionalNeeds, youthCycle, wageBudget };
}
