import { useEffect, useState } from 'react';
import type { CareerSave, CareerSaveV2, MonthlyReport, TrainingPlan } from '@football/contracts';
import { getYouthContent } from '@football/content';
import {
  advanceCareerMonth,
  completeYouthSeason,
  createAdvanceToDecision,
  createSubmitYouthChoice,
  createYouthCareerV2,
  loadCareer,
  submitCareerDecision,
  updateTrainingPlan,
  type YouthSeasonOutcome,
} from '@football/application';
import { CareerCreationForm } from '../career-creation/CareerCreationForm';
import { YouthOpportunityPanel } from '../event-choice/YouthOpportunityPanel';
import { EventChoicePanel } from '../event-choice/EventChoicePanel';
import { CareerDashboard } from '../career-dashboard/CareerDashboard';
import { createBootstrapContent } from './bootstrap-dependencies';
import { createLocalStorageCareerV2Port } from '../persistence/local-storage-save';
import './app.css';

type Step = 'creation' | 'opportunity' | 'dashboard' | 'event';
const bootstrapContent = createBootstrapContent();
const youthContent = getYouthContent();
const advanceToDecision = createAdvanceToDecision(bootstrapContent);
const chooseYouthOpportunity = createSubmitYouthChoice();
const savePort = createLocalStorageCareerV2Port();

export function App() {
  const [step, setStep] = useState<Step>('creation');
  const [bootstrapSave, setBootstrapSave] = useState<CareerSave | null>(null);
  const [save, setSave] = useState<CareerSaveV2 | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [outcome, setOutcome] = useState<YouthSeasonOutcome | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidSlot, setInvalidSlot] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const slot = (await savePort.list())[0];
      if (slot) {
        const result = await savePort.load(slot);
        if (result.status === 'loaded') {
          const restored = loadCareer(result.save, youthContent);
          if (restored.season.completed && !restored.story.pendingEvent) {
            const completed = completeYouthSeason(restored);
            setSave(completed.save);
            setOutcome(completed.outcome);
            setStep('dashboard');
          } else {
            setSave(restored);
            setStep(restored.story.pendingEvent ? 'event' : 'dashboard');
          }
        } else if (result.status === 'invalid') {
          setError(`存档无法恢复：${result.reason}`);
          setInvalidSlot(slot);
        }
      }
      setLoaded(true);
    })();
  }, []);

  const persist = (next: CareerSaveV2) => {
    setSave(next);
    void savePort.save(next.careerId, next);
  };
  const start = (created: CareerSave) => {
    try {
      const pending = advanceToDecision(created);
      setBootstrapSave(pending);
      setStep('opportunity');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const chooseAcademy = (offerId: string) => {
    if (!bootstrapSave) return;
    try {
      const selected = chooseYouthOpportunity(bootstrapSave, offerId);
      const next = createYouthCareerV2(selected, youthContent);
      persist(next);
      setBootstrapSave(null);
      setStep('dashboard');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const progress = (current: CareerSaveV2) => {
    const result = advanceCareerMonth(current, youthContent.academies, youthContent.events);
    persist(result.save);
    if (result.status === 'awaiting-decision') {
      setStep('event');
      return;
    }
    setReport(result.report);
    if (result.status === 'season-complete') {
      const completed = completeYouthSeason(result.save);
      persist(completed.save);
      setOutcome(completed.outcome);
    }
    setStep('dashboard');
  };
  const advance = () => {
    if (!save) return;
    setAdvancing(true);
    setError(null);
    try {
      progress(save);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setAdvancing(false);
    }
  };
  const decide = (choiceId: string) => {
    if (!save?.story.pendingEvent) return;
    try {
      progress(submitCareerDecision(save, save.story.pendingEvent.eventId, choiceId));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const changePlan = (plan: TrainingPlan) => {
    if (save) persist(updateTrainingPlan(save, plan));
  };
  const newCareer = () => {
    if (save) void savePort.delete(save.careerId);
    setSave(null);
    setBootstrapSave(null);
    setReport(null);
    setOutcome(null);
    setStep('creation');
  };
  const discardInvalid = () => {
    if (invalidSlot) void savePort.delete(invalidSlot);
    setInvalidSlot(null);
    setError(null);
  };

  if (!loaded)
    return (
      <main className="app">
        <p>加载中…</p>
      </main>
    );
  const academyName =
    youthContent.academies.find(({ id }) => id === save?.season.academyId)?.name ??
    save?.season.academyId ??
    '';
  return (
    <main className="app">
      <h1>足球生涯模拟器</h1>
      {error && (
        <div role="alert" className="error-card">
          {error}
          {invalidSlot && <button onClick={discardInvalid}>清除损坏存档</button>}
        </div>
      )}
      {step === 'creation' && <CareerCreationForm onComplete={start} content={bootstrapContent} />}
      {step === 'opportunity' && bootstrapSave?.context.pendingOpportunity && (
        <YouthOpportunityPanel
          opportunity={bootstrapSave.context.pendingOpportunity}
          onChoose={chooseAcademy}
          disabled={false}
        />
      )}
      {step === 'dashboard' && save && (
        <CareerDashboard
          save={save}
          academyName={academyName}
          report={report}
          outcome={outcome}
          advancing={advancing}
          onAdvance={advance}
          onTrainingPlanChange={changePlan}
          onNewCareer={newCareer}
        />
      )}
      {step === 'event' && save?.story.pendingEvent && (
        <EventChoicePanel
          key={save.story.pendingEvent.eventId}
          event={save.story.pendingEvent}
          onSubmit={decide}
        />
      )}
    </main>
  );
}

const message = (caught: unknown) =>
  caught instanceof Error ? caught.message : '操作失败，请重试';
