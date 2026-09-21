import type {
  CareerSaveV2Like,
  EventDefinition,
  StoryProgressEntry,
  StoryProgressSnapshot,
} from '@football/contracts';

type StoryNode = {
  event: EventDefinition;
  storyId: string;
  familyId?: string;
};

const WAIT_REASONS: Record<string, string> = {
  training: '等待下一次训练记录',
  match: '等待下一场比赛记录',
  health: '等待下一次健康状态记录',
  event: '等待下一次生涯事件记录',
  relationship: '等待下一次关系记录',
  'first-team': '等待下一次一线队记录',
};

/**
 * 从已经持久化的故事状态和内容图谱生成可解释的故事进度。
 *
 * 这里不推进故事，也不判断事件是否可触发；它只把模拟层已经产生的
 * active/completed 状态映射成月报所需的只读快照。
 */
export const buildStoryProgress = (
  save: CareerSaveV2Like,
  events: readonly EventDefinition[],
): StoryProgressSnapshot => {
  const nodes = events
    .filter((event): event is EventDefinition & { storyId: string } => Boolean(event.storyId))
    .map((event) => ({
      event,
      storyId: event.storyId!,
      ...(event.storyFamilyId ? { familyId: event.storyFamilyId } : {}),
    }));
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const storyIds = [...new Set(nodes.map(({ storyId }) => storyId))].sort();
  const parents = new Map(storyIds.map((storyId) => [storyId, storyId]));
  const incoming = new Map(storyIds.map((storyId) => [storyId, 0]));

  const find = (storyId: string): string => {
    const parent = parents.get(storyId);
    if (!parent || parent === storyId) return storyId;
    const root = find(parent);
    parents.set(storyId, root);
    return root;
  };

  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents.set(rightRoot, leftRoot);
  };

  for (const { event, storyId } of nodes) {
    const nextIds = [
      ...(event.nextEvents ?? []),
      ...event.choices.flatMap((choice) => choice.nextEventIds ?? []),
    ];
    for (const nextId of nextIds) {
      const nextEvent = eventsById.get(nextId);
      if (!nextEvent?.storyId || !parents.has(nextEvent.storyId)) continue;
      incoming.set(nextEvent.storyId, (incoming.get(nextEvent.storyId) ?? 0) + 1);
      union(storyId, nextEvent.storyId);
    }
  }

  const firstNodeByFamily = new Map<string, string>();
  for (const node of nodes) {
    if (!node.familyId) continue;
    const firstStoryId = firstNodeByFamily.get(node.familyId);
    if (firstStoryId) {
      union(firstStoryId, node.storyId);
    } else {
      firstNodeByFamily.set(node.familyId, node.storyId);
    }
  }

  const groups = new Map<string, StoryNode[]>();
  for (const node of nodes) {
    const root = find(node.storyId);
    const group = groups.get(root) ?? [];
    group.push(node);
    groups.set(root, group);
  }

  const entries = [...groups.values()]
    .map((group): StoryProgressEntry | null => {
      const ordered = [...group].sort((left, right) => left.event.id.localeCompare(right.event.id));
      const rootNode =
        ordered.find(({ storyId }) => (incoming.get(storyId) ?? 0) === 0) ?? ordered[0];
      if (!rootNode) return null;

      const completedNodes = ordered.filter(({ storyId }) =>
        save.story.completedStoryIds.includes(storyId),
      ).length;
      const activeNodes = ordered.filter(({ event }) =>
        save.story.activeStorylines.includes(event.id),
      );
      if (completedNodes === 0 && activeNodes.length === 0) return null;

      const completed = completedNodes === ordered.length;
      const status = completed ? 'completed' : activeNodes.length > 0 ? 'active' : 'waiting';
      const activeNodeTitles = activeNodes.map(({ event }) => event.title).slice(0, 8);
      const waitReason =
        activeNodes.length > 0
          ? waitReasonFor(activeNodes[0]!.event)
          : completed
            ? '这条故事线已经完成，影响会留在生涯记录中'
            : '故事线暂时没有待处理场景';

      return {
        storyId: rootNode.familyId ?? rootNode.storyId,
        title: rootNode.event.title,
        status,
        completedNodes,
        totalNodes: ordered.length,
        progressPercent: Math.round((completedNodes / ordered.length) * 100),
        activeNodeTitles,
        waitReason,
      };
    })
    .filter((entry): entry is StoryProgressEntry => entry !== null)
    .sort((left, right) => {
      const statusOrder = { active: 0, waiting: 1, completed: 2 };
      return (
        statusOrder[left.status] - statusOrder[right.status] ||
        left.storyId.localeCompare(right.storyId)
      );
    })
    .slice(0, 8);

  return {
    entries,
    recentChoice: recentChoice(save),
  };
};

const waitReasonFor = (event: EventDefinition): string => {
  const condition = event.condition;
  if (condition.requireActiveInjury) return '需要保持恢复中的伤情';
  const factReason = condition.requireFactType && WAIT_REASONS[condition.requireFactType];
  if (factReason) {
    return factReason;
  }
  if (condition.requireFactText) {
    return '等待出现“' + condition.requireFactText + '”的生涯记录';
  }
  if (condition.requirePersonRole) return '等待与相关人物再次发生场景';
  return '等待下一次合适的生涯节点';
};

const recentChoice = (save: CareerSaveV2Like): StoryProgressSnapshot['recentChoice'] => {
  const fact = [...save.ledger].reverse().find(({ type }) => type === 'decision');
  if (!fact) return null;
  const match = /^\[([^\]]+)\]\s*(.+)$/.exec(fact.summary);
  if (!match) return null;
  return {
    eventTitle: match[1]!,
    choiceText: match[2]!,
    weekKey: fact.weekKey,
  };
};
