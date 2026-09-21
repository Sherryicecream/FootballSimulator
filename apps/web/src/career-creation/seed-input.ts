const MAX_SEED = 2_147_483_647;

export const parseSeedInput = (text: string): number | null => {
  const value = text.trim();
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error('种子请输入非负整数');

  const seed = Number(value);
  if (!Number.isSafeInteger(seed) || seed > MAX_SEED) {
    throw new Error('种子超出范围');
  }
  return seed;
};
