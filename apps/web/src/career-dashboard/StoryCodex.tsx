import type { EventDefinition } from '@football/contracts';
import { labelAttribute } from './career-presentation';

interface StoryCodexProps {
  events: EventDefinition[];
  encounteredEventIds: Set<string>;
}

const THEME_LABELS: Record<string, string> = {
  match: '比赛',
  training: '训练',
  relationships: '关系',
  'off-pitch': '场外',
  health: '健康',
  trajectory: '轨迹',
  media: '媒体',
};

const RARITY_LABELS: Record<string, string> = {
  common: '常见',
  uncommon: '少见',
  rare: '稀有',
  legendary: '传奇',
};

const STATE_EFFECT_LABELS: Record<string, string> = {
  fitness: '体能',
  fatigue: '疲劳',
  morale: '士气',
  coachTrust: '教练信任',
  confidence: '自信',
  form: '状态',
  trust: '信任',
  respect: '尊重',
  closeness: '亲近',
};

const labelEffect = (key: string): string => STATE_EFFECT_LABELS[key] ?? labelAttribute(key);

const describeEffects = (effects: Record<string, number>): string => {
  const parts = Object.entries(effects)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => {
      const label = labelEffect(key);
      return value > 0 ? `${label}+${value}` : `${label}${value}`;
    });
  return parts.length > 0 ? parts.join('、') : '无直接影响';
};

/** 依据 storyId 与 nextEvents 把事件串成剧情线；无 storyId 的事件归入独立事件。 */
export const buildStoryGroups = (
  events: EventDefinition[],
): {
  storylines: Array<{ storyId: string; chain: EventDefinition[] }>;
  standalone: EventDefinition[];
} => {
  const byStoryId = new Map<string, EventDefinition[]>();
  for (const event of events) {
    if (!event.storyId) continue;
    const group = byStoryId.get(event.storyId) ?? [];
    group.push(event);
    byStoryId.set(event.storyId, group);
  }

  const storylines: Array<{ storyId: string; chain: EventDefinition[] }> = [];
  for (const [storyId, group] of byStoryId) {
    const nextTargets = new Set(group.flatMap(({ nextEvents }) => nextEvents ?? []));
    const opening = group.find(({ id }) => !nextTargets.has(id)) ?? group[0]!;
    const chain: EventDefinition[] = [];
    const visited = new Set<string>();
    let cursor: EventDefinition | undefined = opening;
    while (cursor && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      chain.push(cursor);
      const nextId: string | undefined = cursor.nextEvents?.[0];
      cursor = nextId ? group.find(({ id }) => id === nextId) : undefined;
    }
    storylines.push({ storyId, chain });
  }
  storylines.sort((left, right) => left.storyId.localeCompare(right.storyId));

  const standalone = events.filter(({ storyId }) => !storyId);
  return { storylines, standalone };
};

export function StoryCodex({ events, encounteredEventIds }: StoryCodexProps) {
  const { storylines, standalone } = buildStoryGroups(events);

  const renderEvent = (event: EventDefinition) => {
    const encountered = encounteredEventIds.has(event.id);
    const themeLabel = THEME_LABELS[event.theme ?? ''] ?? event.theme ?? '场外';
    const rarityLabel = RARITY_LABELS[event.rarity] ?? event.rarity ?? '常见';
    return (
      <article key={event.id} className={encountered ? 'codex-event met' : 'codex-event'}>
        <h4>
          {event.title}
          {encountered && <span className="codex-badge">已经历</span>}
          <span className="codex-meta">
            {themeLabel}
            {' · '}
            {rarityLabel}
            {' · '}
            {event.interaction === 'automatic' ? '自动事件' : '需要选择'}
          </span>
        </h4>
        <p>{event.description}</p>
        <ul className="codex-choices">
          {event.choices.map((choice) => (
            <li key={choice.id}>
              <strong>{choice.text}</strong>
              <span>→ {describeEffects(choice.effects)}</span>
            </li>
          ))}
        </ul>
      </article>
    );
  };

  return (
    <section className="story-codex" aria-label="剧情图鉴">
      <h3>剧情图鉴</h3>
      <p className="codex-hint">
        这里汇总生涯中可能遇到的剧情线与事件，以及每个选择带来的影响，供回顾与参考。
      </p>

      {storylines.length > 0 && (
        <>
          <h4 className="codex-section">剧情线</h4>
          {storylines.map(({ storyId, chain }) => (
            <div key={storyId} className="codex-storyline">
              <h5>
                剧情线「{chain[0]!.title.replace(/的开场|的开始$/, '')}」
                {encounteredEventIds.has(chain[0]!.id) && (
                  <span className="codex-badge">已经历</span>
                )}
              </h5>
              <ol className="codex-chain">
                {chain.map((event, index) => (
                  <li key={event.id}>
                    {index + 1}. {event.title}
                    {encounteredEventIds.has(event.id) ? '（已经历）' : ''}
                  </li>
                ))}
              </ol>
              {chain.map(renderEvent)}
            </div>
          ))}
        </>
      )}

      {standalone.length > 0 && (
        <>
          <h4 className="codex-section">独立事件</h4>
          <div className="codex-grid">{standalone.map(renderEvent)}</div>
        </>
      )}
    </section>
  );
}
