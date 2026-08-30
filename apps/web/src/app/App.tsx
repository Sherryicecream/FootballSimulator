import { useEffect, useState } from 'react';
import {
  migrateCareerSaveV5,
  type AgentPreferences,
  type CareerSave,
  type CareerSaveV4Like,
  type CareerSaveV5,
  type MonthlyReport,
  type TrainingPlan,
} from '@football/contracts';
import { getYouthContent } from '@football/content';
import {
  advanceCareerMonth,
  completeYouthSeason,
  createAdvanceToDecision,
  createSubmitYouthChoice,
  createYouthCareerV2,
  enterOffseason,
  generateContractOffers,
  acceptRenewal,
  advanceProMonth,
  completeProfessionalSeason,
  declineRenewal,
  loadCareer,
  rejectOffers,
  signContract,
  startNextYouthSeason,
  startProfessionalSeason,
  submitAgentPreferences,
  submitCareerDecision,
  updateTrainingPlan,
  type YouthSeasonOutcome,
} from '@football/application';
import { CareerCreationForm } from '../career-creation/CareerCreationForm';
import { YouthOpportunityPanel } from '../event-choice/YouthOpportunityPanel';
import { EventChoicePanel } from '../event-choice/EventChoicePanel';
import { CareerDashboard } from '../career-dashboard/CareerDashboard';
import { OffseasonBriefing } from '../career-dashboard/OffseasonBriefing';
import { ProDashboard } from '../career-dashboard/ProDashboard';
import { ProOffseasonPanel } from '../career-dashboard/ProOffseasonPanel';
import { AgentPreferencesForm } from '../career-dashboard/AgentPreferencesForm';
import { OfferComparisonPanel } from '../career-dashboard/OfferComparisonPanel';
import { createBootstrapContent } from './bootstrap-dependencies';
import { createLocalStorageCareerV4Port } from '../persistence/local-storage-save';
import './app.css';

type Step =
  | 'creation'
  | 'opportunity'
  | 'dashboard'
  | 'event'
  | 'offseason'
  | 'agent'
  | 'offers'
  | 'pro'
  | 'pro-offseason'
  | 'free-agent';
const bootstrapContent = createBootstrapContent();
const youthContent = getYouthContent();
const advanceToDecision = createAdvanceToDecision(bootstrapContent);
const chooseYouthOpportunity = createSubmitYouthChoice();
const savePort = createLocalStorageCareerV4Port();

export function App() {
  const [step, setStep] = useState<Step>('creation');
  const [bootstrapSave, setBootstrapSave] = useState<CareerSave | null>(null);
  const [save, setSave] = useState<CareerSaveV5 | null>(null);
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
          if (restored.careerPhase === 'offseason') {
            setSave(restored);
            setStep('offseason');
          } else if (restored.careerPhase === 'pro-season') {
            setSave(restored);
            setStep('pro');
          } else if (restored.careerPhase === 'pro-offseason') {
            setSave(restored);
            setStep('pro-offseason');
          } else if (restored.careerPhase === 'free-agent') {
            setSave(restored);
            setStep('free-agent');
          } else if (restored.careerPhase === 'agent-preferences') {
            setSave(restored);
            setStep('agent');
          } else if (restored.careerPhase === 'offer-review') {
            setSave(restored);
            setStep('offers');
          } else if (restored.season.completed && !restored.story.pendingEvent) {
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

  // 任意版本存档统一归一化为 v5 后持久化
  const persist = (next: CareerSaveV4Like) => {
    const normalized = migrateCareerSaveV5(next);
    setSave(normalized);
    void savePort.save(normalized.careerId, normalized);
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
  const progress = (current: CareerSaveV5) => {
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
      if (save.careerPhase === 'pro-season') {
        advancePro(save);
      } else {
        progress(save);
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setAdvancing(false);
    }
  };
  const advancePro = (current: CareerSaveV5) => {
    const result = advanceProMonth(current, youthContent.clubs, youthContent.events);
    persist(result.save);
    if (result.status === 'awaiting-decision') {
      setStep('event');
      return;
    }
    setReport(result.report);
    if (result.status === 'season-complete') {
      const settled = completeProfessionalSeason(result.save);
      persist(settled.save);
      setStep('pro-offseason');
      return;
    }
    setStep('pro');
  };
  const decide = (choiceId: string) => {
    if (!save?.story.pendingEvent) return;
    try {
      const submitted = submitCareerDecision(save, save.story.pendingEvent.eventId, choiceId);
      // 职业赛季中的事件提交后继续职业月度；其余走青训推进
      if (submitted.careerPhase === 'pro-season') {
        advancePro(submitted);
      } else {
        progress(submitted);
      }
    } catch (caught) {
      setError(message(caught));
    }
  };
  const changePlan = (plan: TrainingPlan) => {
    if (save) persist(updateTrainingPlan(save, plan));
  };
  const handleEnterOffseason = () => {
    if (!save) return;
    setError(null);
    try {
      const result = enterOffseason(save, youthContent.academies);
      persist(result.save);
      setStep('offseason');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleStartNextSeason = (academyId?: string) => {
    if (!save) return;
    setError(null);
    try {
      const next = startNextYouthSeason(save, youthContent, academyId);
      persist(next);
      setReport(null);
      setOutcome(null);
      setStep('dashboard');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleSeekOffers = () => {
    if (!save) return;
    setError(null);
    setStep('agent');
  };
  const handleAgentPreferences = (preferences: AgentPreferences) => {
    if (!save) return;
    setError(null);
    try {
      const withPrefs = submitAgentPreferences(save, preferences);
      const withOffers = generateContractOffers(withPrefs, youthContent);
      persist(withOffers);
      setStep('offers');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleSignContract = (offerId: string) => {
    if (!save) return;
    setError(null);
    try {
      persist(signContract(save, offerId));
      setOutcome(null);
      setStep('dashboard');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleRejectOffers = () => {
    if (!save) return;
    setError(null);
    try {
      persist(rejectOffers(save));
      setStep('offseason');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleStartProSeason = () => {
    if (!save) return;
    setError(null);
    try {
      const next = startProfessionalSeason(save, youthContent.clubs);
      persist(next);
      setReport(null);
      setStep('pro');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleAcceptRenewal = () => {
    if (!save) return;
    setError(null);
    try {
      persist(acceptRenewal(save));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleDeclineRenewal = () => {
    if (!save) return;
    setError(null);
    try {
      persist(declineRenewal(save));
      setStep('free-agent');
    } catch (caught) {
      setError(message(caught));
    }
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
        <>
          <CareerDashboard
            save={save}
            events={youthContent.events}
            academyName={academyName}
            report={report}
            outcome={outcome}
            advancing={advancing}
            onAdvance={advance}
            onTrainingPlanChange={changePlan}
            onNewCareer={newCareer}
          />
          {outcome && save.careerPhase === 'youth-season' && (
            <button className="offseason-entry" onClick={handleEnterOffseason}>
              进入休赛期
            </button>
          )}
          {save.careerPhase === 'professional-contract' && (
            <button className="offseason-entry" onClick={handleStartProSeason}>
              开启职业赛季
            </button>
          )}
        </>
      )}
      {step === 'offseason' && save && (
        <OffseasonBriefing
          save={save}
          outcome={outcome}
          academies={youthContent.academies}
          onStartNextSeason={handleStartNextSeason}
          onSeekOffers={handleSeekOffers}
        />
      )}
      {step === 'agent' && save && <AgentPreferencesForm onSubmit={handleAgentPreferences} />}
      {step === 'offers' && save && save.pendingOffers.length > 0 && (
        <OfferComparisonPanel
          offers={save.pendingOffers}
          onSign={handleSignContract}
          onRejectAll={handleRejectOffers}
        />
      )}
      {step === 'pro' && save && (
        <ProDashboard
          save={save}
          report={report}
          advancing={advancing}
          onAdvance={advance}
          onNewCareer={newCareer}
        />
      )}
      {step === 'pro-offseason' && save && (
        <ProOffseasonPanel
          save={save}
          onStartNextSeason={handleStartProSeason}
          onAcceptRenewal={handleAcceptRenewal}
          onDeclineRenewal={handleDeclineRenewal}
        />
      )}
      {step === 'free-agent' && save && (
        <section className="offseason" aria-label="自由球员">
          <h2>生涯进入自由球员阶段</h2>
          <p>你拒绝了续约，现在是自由球员。转会市场将在下一阶段开放（M7）。</p>
          <button onClick={newCareer}>开始新生涯</button>
        </section>
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
