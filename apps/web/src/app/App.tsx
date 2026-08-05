import { useState, useEffect } from 'react';
import type { CareerSave, EventInstance, PlayerState } from '@football/contracts';
import { createBootstrapContent, createYouthEvents } from './bootstrap-dependencies';
import { CareerCreationForm } from '../career-creation/CareerCreationForm';
import { YouthOpportunityPanel } from '../event-choice/YouthOpportunityPanel';
import { EventChoicePanel } from '../event-choice/EventChoicePanel';
import { EventResultPanel } from '../event-choice/EventResultPanel';
import { CareerDashboard } from '../career-dashboard/CareerDashboard';
import {
  createAdvanceToDecision,
  createSubmitYouthChoice,
  createSubmitEventChoice,
} from '@football/application';
import { createLocalStorageSavePort } from '../persistence/local-storage-save';
import './app.css';

type FlowStep = 'creation' | 'opportunity' | 'dashboard' | 'event-choice' | 'event-result' | 'weekly-report';

const content = createBootstrapContent();
const events = createYouthEvents();
const advanceToDecision = createAdvanceToDecision(content);
const submitYouthChoice = createSubmitYouthChoice();
const submitEventChoice = createSubmitEventChoice();
const savePort = createLocalStorageSavePort();

export function App() {
  const [step, setStep] = useState<FlowStep>('creation');
  const [save, setSave] = useState<CareerSave | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<EventInstance | null>(null);
  const [chosenChoiceId, setChosenChoiceId] = useState<string | null>(null);
  const [oldPlayerState, setOldPlayerState] = useState<PlayerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Try to load saved career on startup
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const slots = await savePort.list();
        if (slots.length > 0) {
          const slotId = slots[0]!;
          const saved = await savePort.load(slotId);
          if (saved) {
            setSave(saved);
            setStep('dashboard');
            setLoaded(true);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load saved career:', e);
      }
      setLoaded(true);
    };
    loadSaved();
  }, []);

  const handleCreationComplete = (careerSave: CareerSave) => {
    setSave(careerSave);
    setLoading(true);
    setError(null);
    try {
      const pending = advanceToDecision(careerSave);
      setSave(pending);
      setStep('opportunity');
    } catch (err) {
      setError(err instanceof Error ? err.message : '推进失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (offerId: string) => {
    if (!save) return;
    try {
      const updated = submitYouthChoice(save, offerId);
      setSave(updated);
      setStep('dashboard');
      savePort.save(updated.careerId, updated).catch(console.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : '选择失败');
    }
  };

  const handleAdvance = (updatedSave: CareerSave) => {
    setSave(updatedSave);
    if (updatedSave.context.pendingEvent) {
      setPendingEvent(updatedSave.context.pendingEvent);
      setStep('event-choice');
    } else {
      setStep('dashboard');
    }
    savePort.save(updatedSave.careerId, updatedSave).catch(console.error);
  };

  const handleEventChoice = (choiceId: string) => {
    if (!save) return;
    try {
      // Save old state for comparison before applying choice
      setOldPlayerState(save.context.playerState);
      setChosenChoiceId(choiceId);
      const updated = submitEventChoice(save, choiceId);
      setSave(updated);
      setStep('event-result');
      savePort.save(updated.careerId, updated).catch(console.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    }
  };

  const handleNewCareer = () => {
    if (save) {
      savePort.delete(save.careerId).catch(console.error);
    }
    setSave(null);
    setPendingEvent(null);
    setChosenChoiceId(null);
    setOldPlayerState(null);
    setError(null);
    setStep('creation');
  };

  if (!loaded) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px',
          fontFamily: 'var(--font-serif)',
          color: 'var(--color-text-secondary)',
        }}
      >
        加载中...
      </div>
    );
  }

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

      {error && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
            fontSize: 'var(--text-base)',
            color: 'var(--color-accent)',
          }}
        >
          {error}
        </div>
      )}

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

      {step === 'dashboard' && save && (
        <CareerDashboard save={save} onSaveUpdate={handleAdvance} onNewCareer={handleNewCareer} events={events} />
      )}

      {step === 'event-choice' && pendingEvent && (
        <div>
          <EventChoicePanel event={pendingEvent} onSubmit={handleEventChoice} />
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: 'var(--space-lg)',
              textAlign: 'center',
            }}
          >
            <button
              onClick={() => {
                setStep('dashboard');
                setPendingEvent(null);
              }}
              style={{
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                padding: 'var(--space-md) 20px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
                cursor: 'pointer',
              }}
            >
              返回仪表盘
            </button>
          </div>
        </div>
      )}

      {step === 'event-result' && pendingEvent && chosenChoiceId && oldPlayerState && save && (
        <EventResultPanel
          event={pendingEvent}
          chosenChoiceId={chosenChoiceId}
          oldPlayerState={oldPlayerState}
          newPlayerState={save.context.playerState}
          onContinue={() => setStep('dashboard')}
        />
      )}
    </div>
  );
}