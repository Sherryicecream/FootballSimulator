import { describe, it, expect } from 'vitest';
import { renderTemplate, generateEventNarrative } from '../../src/events/narrative';

describe('narrative', () => {
  it('渲染简单模板', () => {
    const result = renderTemplate('你好，{name}！', { name: '张伟' });
    expect(result).toBe('你好，张伟！');
  });

  it('渲染多个变量', () => {
    const result = renderTemplate('{player}在{club}的训练中表现出色', {
      player: '张伟',
      club: '上海翼帆',
    });
    expect(result).toBe('张伟在上海翼帆的训练中表现出色');
  });

  it('未提供变量时保留占位符', () => {
    const result = renderTemplate('你好，{name}！', {});
    expect(result).toBe('你好，{name}！');
  });

  it('处理数字变量', () => {
    const result = renderTemplate('赛季 {season} 第 {week} 周', { season: 2024, week: 5 });
    expect(result).toBe('赛季 2024 第 5 周');
  });

  it('根据事件生成完整叙事文本', () => {
    const narrative = generateEventNarrative(
      '教练的挑战',
      '主教练{coachName}对球员{playerName}提出了更高的要求。',
      '接受挑战，加倍努力训练',
      { coachName: '李教练', playerName: '张伟' },
    );
    expect(narrative).toContain('教练的挑战');
    expect(narrative).toContain('李教练');
    expect(narrative).toContain('张伟');
    expect(narrative).toContain('你的选择：');
  });

  it('叙事文本包含 Markdown 格式', () => {
    const narrative = generateEventNarrative(
      '标题',
      '描述内容',
      '选择内容',
      {},
    );
    expect(narrative).toContain('## ');
    expect(narrative).toContain('\n\n');
  });

  it('空变量对象不报错', () => {
    const result = renderTemplate('纯文本模板', {});
    expect(result).toBe('纯文本模板');
  });
});