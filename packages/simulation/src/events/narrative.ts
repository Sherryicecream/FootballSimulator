/**
 * 简单模板渲染：将 {key} 替换为变量值
 * 未提供的变量保留原占位符
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return variables[key] !== undefined ? String(variables[key]) : `{${key}}`;
  });
}

/**
 * 生成事件叙事文本（Markdown 格式）
 * 格式：## 标题\n\n描述\n\n**你的选择：** 选择内容
 */
export function generateEventNarrative(
  title: string,
  description: string,
  choiceText: string,
  context: Record<string, string | number>,
): string {
  const renderedTitle = renderTemplate(title, context);
  const renderedDesc = renderTemplate(description, context);
  const renderedChoice = renderTemplate(choiceText, context);

  return `## ${renderedTitle}\n\n${renderedDesc}\n\n**你的选择：** ${renderedChoice}`;
}
