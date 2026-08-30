import { useState } from 'react';
import type { AgentPreferences } from '@football/contracts';

interface AgentPreferencesFormProps {
  onSubmit: (preferences: AgentPreferences) => void;
}

const tierBiasLabels: Record<AgentPreferences['leagueTierBias'], string> = {
  high: '敢于冲击高层级联赛',
  balanced: '均衡考虑各层级',
  low: '优先稳定出场的低层级',
};

const priorityLabels: Record<AgentPreferences['priority'], string> = {
  'playing-time': '出场时间',
  salary: '薪资待遇',
  development: '成长环境',
};

export function AgentPreferencesForm({ onSubmit }: AgentPreferencesFormProps) {
  const [leagueTierBias, setTierBias] = useState<AgentPreferences['leagueTierBias']>('balanced');
  const [priority, setPriority] = useState<AgentPreferences['priority']>('playing-time');

  return (
    <section className="agent-form" aria-label="经纪人倾向">
      <h2>与经纪人沟通</h2>
      <p>告诉经纪人你的偏好。这会影响收到的报价构成，但不保证结果。</p>

      <fieldset>
        <legend>联赛层级偏好</legend>
        {(Object.keys(tierBiasLabels) as AgentPreferences['leagueTierBias'][]).map((bias) => (
          <label key={bias} className="choice-row">
            <input
              type="radio"
              name="tier-bias"
              checked={leagueTierBias === bias}
              onChange={() => setTierBias(bias)}
            />
            {tierBiasLabels[bias]}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>优先诉求</legend>
        {(Object.keys(priorityLabels) as AgentPreferences['priority'][]).map((value) => (
          <label key={value} className="choice-row">
            <input
              type="radio"
              name="priority"
              checked={priority === value}
              onChange={() => setPriority(value)}
            />
            {priorityLabels[value]}
          </label>
        ))}
      </fieldset>

      <button onClick={() => onSubmit({ leagueTierBias, priority })}>等待经纪人的报价</button>
    </section>
  );
}
