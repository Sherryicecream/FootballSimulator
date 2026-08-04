import { useState } from 'react';
import type { CareerSave } from '@football/contracts';
import { createBootstrapContent } from './bootstrap-dependencies';
import { CareerCreationForm } from '../career-creation/CareerCreationForm';
import { YouthOpportunityPanel } from '../event-choice/YouthOpportunityPanel';
import { BootstrapCareerSummary } from '../career-dashboard/BootstrapCareerSummary';
import { createAdvanceToDecision, createSubmitYouthChoice } from '@football/application';
import './app.css';

type FlowStep = 'creation' | 'opportunity' | 'summary';

const content = createBootstrapContent();
const advanceToDecision = createAdvanceToDecision(content);
const submitYouthChoice = createSubmitYouthChoice();

export function App() {
  const [step, setStep] = useState<FlowStep>('creation');
  const [save, setSave] = useState<CareerSave | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreationComplete = (careerSave: CareerSave) => {
    setSave(careerSave);
    setLoading(true);
    try {
      const pending = advanceToDecision(careerSave);
      setSave(pending);
      setStep('opportunity');
    } catch (err) {
      console.error('Failed to advance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (offerId: string) => {
    if (!save) return;
    const updated = submitYouthChoice(save, offerId);
    setSave(updated);
    setStep('summary');
  };

  return (
    <div className="app" role="main">
      <h1
        style={{
          fontSize: 'var(--text-2xl)',
          color: 'var(--color-ink)',
          marginBottom: 'var(--space-2xl)',
          letterSpacing: '1px',
        }}
      >
        足球生涯模拟器
      </h1>

      {step === 'creation' && (
        <CareerCreationForm onComplete={handleCreationComplete} content={content} />
      )}

      {step === 'opportunity' && save?.context.pendingOpportunity && (
        <YouthOpportunityPanel
          opportunity={save.context.pendingOpportunity}
          onChoose={handleChoice}
          disabled={loading}
        />
      )}

      {step === 'summary' && save && <BootstrapCareerSummary save={save} />}
    </div>
  );
}
