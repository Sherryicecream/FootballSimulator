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
  clearEventFeedback,
  completeProfessionalSeason,
  declineRenewal,
  generateFreeAgentOffers,
  loadCareer,
  rejectOffers,
  retire,
  signContract,
  signTransfer,
  startNextYouthSeason,
  startProfessionalSeason,
  submitNationalTeamDecision,
  submitAgentPreferences,
  submitCareerDecision,
  updateTrainingPlan,
  type YouthSeasonOutcome,
} from '@football/application';
import { CareerCreationForm } from '../career-creation/CareerCreationForm';
import { YouthOpportunityPanel } from '../event-choice/YouthOpportunityPanel';
import { EventChoicePanel } from '../event-choice/EventChoicePanel';
import { EventFeedbackPanel } from '../event-choice/EventFeedbackPanel';
import { CareerDashboard } from '../career-dashboard/CareerDashboard';
import { OffseasonBriefing } from '../career-dashboard/OffseasonBriefing';
import { ProDashboard } from '../career-dashboard/ProDashboard';
import { ProOffseasonPanel } from '../career-dashboard/ProOffseasonPanel';
import { CareerReviewPage } from '../career-dashboard/CareerReviewPage';
import { AgentPreferencesForm } from '../career-dashboard/AgentPreferencesForm';
import { OfferComparisonPanel } from '../career-dashboard/OfferComparisonPanel';
import { sceneKindForTheme } from '../career-dashboard/career-presentation';
import { createBootstrapContent } from './bootstrap-dependencies';
import { createLocalStorageCareerV4Port } from '../persistence/local-storage-save';
import './app.css';

type Step =
  | 'creation'
  | 'opportunity'
  | 'dashboard'
  | 'event'
  | 'event-feedback'
  | 'offseason'
  | 'agent'
  | 'offers'
  | 'pro'
  | 'pro-offseason'
  | 'free-agent'
  | 'retired';
const bootstrapContent = createBootstrapContent();
const youthContent = getYouthContent();
const professionalClubs = [...youthContent.clubs, ...youthContent.overseasClubs];
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
  const [freeAgentRetireConfirm, setFreeAgentRetireConfirm] = useState(false);
  const activeEventId = save?.story.pendingEvent?.eventId ?? save?.story.pendingFeedback?.eventId;
  const pendingEventDefinition = activeEventId
    ? youthContent.events.find(({ id }) => id === activeEventId)
    : undefined;
  const eventSceneKind = sceneKindForTheme(pendingEventDefinition?.theme);

  useEffect(() => {
    void (async () => {
      const slot = (await savePort.list())[0];
      if (slot) {
        const result = await savePort.load(slot);
        if (result.status === 'loaded') {
          const restored = loadCareer(result.save, youthContent);
          if (restored.story.pendingFeedback) {
            setSave(restored);
            setStep('event-feedback');
          } else if (restored.careerPhase === 'offseason') {
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
          } else if (restored.careerPhase === 'retired') {
            setSave(restored);
            setStep('retired');
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
    const result = advanceProMonth(current, professionalClubs, youthContent.events);
    persist(result.save);
    if (result.status === 'awaiting-decision') {
      setStep('event');
      return;
    }
    setReport(result.report);
    if (result.status === 'season-complete') {
      const settled = completeProfessionalSeason(result.save);
      persist(settled.save);
      setStep(settled.save.story.pendingEvent ? 'event' : 'pro-offseason');
      return;
    }
    setStep('pro');
  };
  const decide = (choiceId: string) => {
    if (!save?.story.pendingEvent) return;
    try {
      if (
        save.careerPhase === 'pro-offseason' &&
        save.story.pendingEvent.storyId === 'national-team-debut'
      ) {
        const submitted = submitNationalTeamDecision(save, choiceId);
        persist(submitted);
        setStep('event-feedback');
        return;
      }
      const submitted = submitCareerDecision(save, save.story.pendingEvent.eventId, choiceId);
      persist(submitted);
      setStep('event-feedback');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const continueAfterEventFeedback = () => {
    if (!save?.story.pendingFeedback) return;
    setError(null);
    try {
      const cleared = clearEventFeedback(save);
      persist(cleared);
      if (cleared.careerPhase === 'pro-season') {
        advancePro(cleared);
      } else if (cleared.careerPhase === 'pro-offseason') {
        setStep('pro-offseason');
      } else {
        progress(cleared);
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
      const next = startProfessionalSeason(save, professionalClubs);
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
      const free = declineRenewal(save);
      const withOffers = generateFreeAgentOffers(free, youthContent);
      persist(withOffers);
      setStep('free-agent');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleSignTransfer = (offerId: string) => {
    if (!save) return;
    setError(null);
    try {
      persist(signTransfer(save, offerId));
      setStep('dashboard');
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleWaitWindow = () => {
    if (!save) return;
    setError(null);
    try {
      const withOffers = generateFreeAgentOffers(save, youthContent);
      persist(withOffers);
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleRetire = () => {
    if (step === 'free-agent' && !freeAgentRetireConfirm) {
      setFreeAgentRetireConfirm(true);
      return;
    }
    if (!save) return;
    setError(null);
    try {
      const date = save.proSeason?.endDate ?? new Date().toISOString().slice(0, 10);
      persist(retire(save, date));
      setFreeAgentRetireConfirm(false);
      setStep('retired');
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
    setFreeAgentRetireConfirm(false);
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
          onRetire={handleRetire}
        />
      )}
      {step === 'free-agent' && save && (
        <section className="offseason" aria-label="自由球员">
          <h2>自由球员</h2>
          {save.pendingOffers.length > 0 ? (
            <OfferComparisonPanel
              offers={save.pendingOffers}
              onSign={handleSignTransfer}
              onRejectAll={handleWaitWindow}
            />
          ) : (
            <>
              <p>转会市场暂时冷淡，没有俱乐部给出要约。</p>
              {save.freeAgentSeasons >= 2 && save.player.age < 30 && (
                <p className="warning">你的市场价值正在下降，考虑接受更低的报价。</p>
              )}
              <div className="offseason-actions">
                <button onClick={handleWaitWindow}>等待下一个转会窗口</button>
                {save.player.age >= 30 && (
                  <button className="secondary-action" onClick={handleRetire}>
                    宣布退役
                  </button>
                )}
              </div>
            </>
          )}
          {save.player.age >= 30 && save.pendingOffers.length > 0 && (
            <div className="offseason-actions">
              <button className="secondary-action" onClick={handleRetire}>
                宣布退役
              </button>
            </div>
          )}
          {freeAgentRetireConfirm && (
            <div>
              <p>退役是不可逆的，将结束当前生涯并生成回顾。</p>
              <button onClick={handleRetire}>确认退役</button>
              <button onClick={() => setFreeAgentRetireConfirm(false)}>继续寻找机会</button>
            </div>
          )}
        </section>
      )}
      {step === 'retired' && save && <CareerReviewPage save={save} onNewCareer={newCareer} />}
      {step === 'event' && save?.story.pendingEvent && (
        <EventChoicePanel
          key={save.story.pendingEvent.eventId}
          event={save.story.pendingEvent}
          sceneKind={eventSceneKind}
          onSubmit={decide}
        />
      )}
      {step === 'event-feedback' && save?.story.pendingFeedback && (
        <EventFeedbackPanel
          feedback={save.story.pendingFeedback}
          sceneKind={eventSceneKind}
          onContinue={continueAfterEventFeedback}
        />
      )}
    </main>
  );
}

const message = (caught: unknown) =>
  caught instanceof Error ? caught.message : '操作失败，请重试';
