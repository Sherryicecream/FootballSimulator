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

export const WEAK_FOOT_OPTIONS = [
  { value: '1', label: '1 · 极弱' },
  { value: '2', label: '2 · 较弱' },
  { value: '3', label: '3 · 中等' },
  { value: '4', label: '4 · 较好' },
  { value: '5', label: '5 · 出色' },
] as const;

export const BACKGROUND_OPTIONS = [
  { value: 'academy', label: '青训营' },
  { value: 'school', label: '校园足球' },
  { value: 'community', label: '社区足球' },
  { value: 'late-bloomer', label: '大器晚成' },
] as const;

export const PERSONALITY_OPTIONS = [
  { value: 'ambitious', label: '雄心勃勃' },
  { value: 'composed', label: '沉稳' },
  { value: 'disciplined', label: '自律' },
  { value: 'expressive', label: '张扬' },
] as const;