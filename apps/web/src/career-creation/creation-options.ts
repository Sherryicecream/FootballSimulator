export const POSITION_OPTIONS = [
  { value: 'CENTER_BACK', label: '中后卫' },
  { value: 'FULL_BACK', label: '边后卫' },
  { value: 'DEFENSIVE_MIDFIELDER', label: '后腰' },
  { value: 'MIDFIELDER', label: '中场' },
  { value: 'WINGER', label: '边锋' },
  { value: 'FORWARD', label: '前锋' },
] as const;

export const FOOT_OPTIONS = [
  { value: 'LEFT', label: '左脚' },
  { value: 'RIGHT', label: '右脚' },
  { value: 'BOTH', label: '双脚' },
] as const;
