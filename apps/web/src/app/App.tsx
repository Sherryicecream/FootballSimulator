import { useEffect, useRef, useState } from 'react';
import {
  migrateCareerSaveV7,
  type AgentPreferences,
  type CareerArchiveV1,
  type CareerSave,
  type CareerSaveV5Like,
  type CareerSaveV7,
  type ContractOfferV3,
  type MonthlyReport,
  type TrainingPlan,
  type WorldFact,
} from '@football/contracts';
import { getYouthContent } from '@football/content';
import {
  advanceCareerMonth,
  buildCareerArchive,
  completeYouthSeason,
  canContinueYouthSeason,
  createAdvanceToDecision,
  createSubmitYouthChoice,
  createYouthCareerV2,
  enterOffseason,
  generateContractOffers,
  acceptRenewal,
  advanceProMonth,
  advanceToNextNode,
  canEndYouthCareer,
  clearEventFeedback,
  completeProfessionalSeason,
  declineRenewal,
  endProfessionalCareer,
  endYouthCareer,
  generateFreeAgentOffers,
  rejectOffers,
  requestCareerMarket,
  signMarketOffer,
  signContract,
  signTransfer,
  startNextYouthSeason,
  startProfessionalSeason,
  submitNationalTeamDecision,
  submitAgentPreferences,
  submitCareerDecision,
  updateTrainingPlan,
  buildWorldNewsForCareer,
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
import { NodeBrief } from '../career-dashboard/NodeBrief';
import { CareerReviewPage } from '../career-dashboard/CareerReviewPage';
import { AgentPreferencesForm } from '../career-dashboard/AgentPreferencesForm';
import { OfferComparisonPanel } from '../career-dashboard/OfferComparisonPanel';
import {
  isMatchMomentEventId,
  matchMomentSceneKind,
  sceneKindForTheme,
} from '../career-dashboard/career-presentation';
import { SceneBanner } from '../design-system/SceneBanner';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { createBootstrapContent } from './bootstrap-dependencies';
import {
  createLocalNarrativeClientFromEnv,
  type LocalNarrativeClient,
} from '../narration/local-ai-client';
import {
  createLocalStorageCareerPort,
  type CareerSlotRecord,
} from '../persistence/local-storage-save';
import { downloadCareerExport } from '../persistence/career-export';
import { CareerSaveSelector } from '../career-saves/CareerSaveSelector';
import { SaveStatusIndicator, type SaveCommitState } from '../career-saves/SaveStatusIndicator';
import './app.css';

const localNarrativeClient: LocalNarrativeClient | null = createLocalNarrativeClientFromEnv({
  VITE_LOCAL_AI_ENDPOINT: import.meta.env.VITE_LOCAL_AI_ENDPOINT,
});

type Step =
  | 'archives'
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
const academyNames = new Map(youthContent.academies.map(({ id, name }) => [id, name]));
const advanceToDecision = createAdvanceToDecision(bootstrapContent);
const chooseYouthOpportunity = createSubmitYouthChoice();
const savePort = createLocalStorageCareerPort();

type PendingCommit = {
  save: CareerSaveV7;
  transition: (saved: CareerSaveV7) => void;
};

type FreeAgentRetireKind = 'market-exit' | 'voluntary-retirement';

const careerEndDate = (save: CareerSaveV7): string =>
  save.proSeason?.endDate ??
  save.contract?.signedOn ??
  save.offseason?.nextSeasonStart ??
  save.season.endDate;

const worldFactsFromSave = (save: CareerSaveV7): WorldFact[] => {
  const clubNames = new Map(professionalClubs.map(({ id, name }) => [id, name]));
  const pulseFacts = save.worldRegistry.clubPulses.map((pulse) => {
    const category: WorldFact['category'] =
      pulse.continentalStatus === 'none' ? 'domestic' : 'continental';
    return {
      id: `world-pulse-${pulse.clubId}-${pulse.seasonId}`,
      occurredOn: pulse.seasonId,
      category,
      relatedClubIds: [pulse.clubId],
      summary:
        pulse.finalRank === null
          ? `${clubNames.get(pulse.clubId) ?? pulse.clubId} 已完成本赛季世界状态结算。`
          : `${clubNames.get(pulse.clubId) ?? pulse.clubId} 本赛季联赛排名第 ${pulse.finalRank}，获得 ${pulse.points} 分。`,
      window: 'season' as const,
    };
  });
  const transferFacts = (save.worldRegistry.transferWindow?.activities ?? []).map((activity) => ({
    id: activity.relatedFactId,
    occurredOn: activity.seasonId,
    category: 'transfer' as const,
    relatedClubIds: [activity.fromClubId, activity.toClubId],
    summary: `${clubNames.get(activity.toClubId) ?? activity.toClubId} 在${activity.window}窗口寻找 ${activity.position}。`,
    window: activity.window,
  }));
  return [...pulseFacts, ...transferFacts];
};

export function App() {
  const [step, setStep] = useState<Step>('creation');
  const [bootstrapSave, setBootstrapSave] = useState<CareerSave | null>(null);
  const [save, setSave] = useState<CareerSaveV7 | null>(null);
  const [archive, setArchive] = useState<CareerArchiveV1 | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [outcome, setOutcome] = useState<YouthSeasonOutcome | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<CareerSlotRecord[]>([]);
  const [commitState, setCommitState] = useState<SaveCommitState>({ status: 'idle' });
  const [openingSlotId, setOpeningSlotId] = useState<string | null>(null);
  const [freeAgentRetireConfirm, setFreeAgentRetireConfirm] = useState<FreeAgentRetireKind | null>(
    null,
  );
  const pendingCommit = useRef<PendingCommit | null>(null);
  const archiveRequest = useRef(0);
  const isSaving = commitState.status === 'saving';
  const archiveBusy = isSaving || openingSlotId !== null;
  const activeEventId = save?.story.pendingEvent?.eventId ?? save?.story.pendingFeedback?.eventId;
  const pendingEventDefinition = activeEventId
    ? youthContent.events.find(({ id }) => id === activeEventId)
    : undefined;
  const eventSceneKind =
    matchMomentSceneKind(save?.story.pendingEvent ?? null) ??
    (save?.story.pendingFeedback && isMatchMomentEventId(save.story.pendingFeedback.eventId)
      ? 'match'
      : null) ??
    sceneKindForTheme(pendingEventDefinition?.theme);
  const canContinueYouth = save ? canContinueYouthSeason(save) : false;
  const canEndYouth = save ? canEndYouthCareer(save) : false;
  const pendingFeedbackNextEvents =
    save?.story.pendingFeedback?.nextEventIds?.flatMap((eventId) => {
      const definition = youthContent.events.find(({ id }) => id === eventId);
      return definition ? [{ id: definition.id, title: definition.title }] : [];
    }) ?? [];

  useEffect(() => {
    void (async () => {
      try {
        const listed = await savePort.list();
        setRecords(listed);
        setStep(listed.length === 0 ? 'creation' : 'archives');
      } catch (caught) {
        setError(message(caught));
        setStep('creation');
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const refreshRecords = async () => {
    setRecords(await savePort.list());
  };
  const writeCommit = async ({ save: candidate, transition }: PendingCommit) => {
    setCommitState({ status: 'saving' });
    let completedArchive: CareerArchiveV1 | null = null;
    try {
      if (candidate.careerEnd) {
        completedArchive = buildCareerArchive(candidate);
        await savePort.saveArchive(candidate.careerId, completedArchive);
      } else {
        await savePort.save(candidate.careerId, candidate);
      }
    } catch (caught) {
      setCommitState({
        status: 'error',
        message: `${candidate.careerEnd ? '历史档案转换失败' : '保存失败'}：${message(caught)}`,
      });
      return;
    }

    setArchive(completedArchive);
    setSave(completedArchive ? null : candidate);
    setFreeAgentRetireConfirm(null);
    pendingCommit.current = null;
    setCommitState({ status: 'saved' });
    transition(candidate);
    try {
      await refreshRecords();
    } catch (caught) {
      setError(message(caught));
    }
  };
  const commitCareer = async (
    raw: CareerSaveV5Like | CareerSaveV7,
    transition: (saved: CareerSaveV7) => void,
  ) => {
    const pending = { save: migrateCareerSaveV7(raw), transition };
    pendingCommit.current = pending;
    await writeCommit(pending);
  };
  const retryCommit = async () => {
    if (pendingCommit.current) await writeCommit(pendingCommit.current);
  };
  const clearPendingCommit = () => {
    pendingCommit.current = null;
    setCommitState({ status: 'idle' });
  };
  const cancelArchiveRequest = () => {
    archiveRequest.current += 1;
    setOpeningSlotId(null);
  };
  const continueCareer = async (slotId: string) => {
    const requestId = ++archiveRequest.current;
    clearPendingCommit();
    setError(null);
    setFreeAgentRetireConfirm(null);
    setOpeningSlotId(slotId);
    try {
      const result = await savePort.load(slotId);
      if (requestId !== archiveRequest.current) return;
      if (result.status === 'archived') {
        setSave(null);
        setArchive(result.archive);
        setReport(null);
        setOutcome(null);
        setStep('retired');
        return;
      }
      if (result.status !== 'loaded') return;
      const restored = hydrateLoadedCareer(result.save);
      if (restored.careerEnd) {
        let convertedArchive: CareerArchiveV1 | null = null;
        try {
          convertedArchive = buildCareerArchive(restored);
          await savePort.saveArchive(restored.careerId, convertedArchive);
        } catch (caught) {
          setError(`历史档案转换失败：${message(caught)}`);
        }
        if (requestId !== archiveRequest.current) return;
        setArchive(convertedArchive);
        setSave(convertedArchive ? null : restored);
        setReport(null);
        setOutcome(null);
        if (convertedArchive) {
          try {
            await refreshRecords();
          } catch (caught) {
            setError(message(caught));
          }
        }
        setStep('retired');
        return;
      }
      if (
        restored.careerPhase === 'youth-season' &&
        restored.season.completed &&
        !restored.story.pendingEvent &&
        !restored.story.pendingFeedback
      ) {
        const completed = completeYouthSeason(restored);
        await commitCareer(completed.save, () => {
          if (requestId !== archiveRequest.current) return;
          setReport(restored.lastMonthlyReport ?? null);
          setOutcome(completed.outcome);
          setStep('dashboard');
        });
        return;
      }
      setArchive(null);
      setSave(restored);
      setReport(restored.lastMonthlyReport ?? null);
      setOutcome(null);
      setStep(stepFor(restored));
    } finally {
      if (requestId === archiveRequest.current) setOpeningSlotId(null);
    }
  };
  const createFromArchives = () => {
    cancelArchiveRequest();
    clearPendingCommit();
    setSave(null);
    setArchive(null);
    setBootstrapSave(null);
    setReport(null);
    setOutcome(null);
    setFreeAgentRetireConfirm(null);
    setStep('creation');
  };
  const exportCareer = async (slotId: string) => {
    setError(null);
    try {
      const raw = await savePort.exportRaw(slotId);
      downloadCareerExport(raw, slotId);
    } catch (caught) {
      setError(`导出失败：${message(caught)}`);
    }
  };
  const deleteCareer = async (slotId: string) => {
    await savePort.delete(slotId);
    await refreshRecords();
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
  const chooseAcademy = async (offerId: string) => {
    if (!bootstrapSave) return;
    try {
      const selected = chooseYouthOpportunity(bootstrapSave, offerId);
      const next = createYouthCareerV2(selected, youthContent);
      await commitCareer(next, () => {
        setBootstrapSave(null);
        setStep('dashboard');
      });
    } catch (caught) {
      setError(message(caught));
    }
  };
  const prepareYouthProgressCommit = (current: CareerSaveV7): PendingCommit => {
    const result = advanceCareerMonth(
      toApplicationSaveV5(current),
      youthContent.academies,
      youthContent.events,
    );
    let candidate: CareerSaveV5Like | CareerSaveV7 = result.save;
    let completedOutcome: YouthSeasonOutcome | null = null;
    if (result.status === 'season-complete') {
      const completed = completeYouthSeason(result.save);
      candidate = completed.save;
      completedOutcome = completed.outcome;
    }
    return {
      save: migrateCareerSaveV7(candidate),
      transition: () => {
        if (result.status === 'awaiting-decision') {
          setStep('event');
          return;
        }
        setReport(result.report);
        if (completedOutcome) setOutcome(completedOutcome);
        setStep('dashboard');
      },
    };
  };
  const progress = async (current: CareerSaveV7) => {
    const pending = prepareYouthProgressCommit(current);
    await commitCareer(pending.save, pending.transition);
  };
  const advance = async () => {
    if (!save) return;
    setAdvancing(true);
    setError(null);
    try {
      if (save.careerPhase === 'pro-season') {
        await advancePro(save);
      } else {
        await progress(save);
      }
    } catch (caught) {
      setError(message(caught));
    } finally {
      setAdvancing(false);
    }
  };
  const advanceToNode = async () => {
    if (!save) return;
    setAdvancing(true);
    setError(null);
    try {
      const result = advanceToNextNode(save, {
        academies: youthContent.academies,
        clubs: professionalClubs,
        events: youthContent.events,
      });
      await commitCareer(result.save, () => {
        setReport(null);
        setOutcome(result.youthOutcome ?? null);
        if (result.save.careerEnd) {
          setStep('retired');
          return;
        }
        if (result.save.story.pendingEvent) {
          setStep('event');
          return;
        }
        if (result.save.careerPhase === 'pro-offseason') {
          setStep('pro-offseason');
          return;
        }
        if (result.save.careerPhase === 'free-agent') {
          setStep('free-agent');
          return;
        }
        setStep(result.save.careerPhase === 'pro-season' ? 'pro' : 'dashboard');
      });
    } catch (caught) {
      setError(message(caught));
    } finally {
      setAdvancing(false);
    }
  };
  const prepareProProgressCommit = (current: CareerSaveV7): PendingCommit => {
    const result = advanceProMonth(
      toApplicationSaveV5(current),
      professionalClubs,
      youthContent.events,
    );
    let candidate: CareerSaveV5Like | CareerSaveV7 = result.save;
    let settledStep: Step | null = null;
    if (result.status === 'season-complete') {
      const settled = completeProfessionalSeason(result.save);
      candidate = settled.save;
      settledStep = settled.save.story.pendingEvent ? 'event' : 'pro-offseason';
    }
    return {
      save: migrateCareerSaveV7(candidate),
      transition: () => {
        if (result.status === 'awaiting-decision') {
          setStep('event');
          return;
        }
        setReport(result.report);
        setStep(settledStep ?? 'pro');
      },
    };
  };
  const advancePro = async (current: CareerSaveV7) => {
    const pending = prepareProProgressCommit(current);
    await commitCareer(pending.save, pending.transition);
  };
  const decide = async (choiceId: string) => {
    if (!save?.story.pendingEvent) return;
    try {
      if (
        save.careerPhase === 'pro-offseason' &&
        save.story.pendingEvent.storyId === 'national-team-debut'
      ) {
        const submitted = submitNationalTeamDecision(toApplicationSaveV5(save), choiceId);
        await commitCareer(submitted, () => setStep('event-feedback'));
        return;
      }
      const submitted = submitCareerDecision(
        toApplicationSaveV5(save),
        save.story.pendingEvent.eventId,
        choiceId,
      );
      await commitCareer(submitted, () => setStep('event-feedback'));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const continueAfterEventFeedback = async () => {
    if (!save?.story.pendingFeedback) return;
    setError(null);
    try {
      const cleared = migrateCareerSaveV7(clearEventFeedback(toApplicationSaveV5(save)));
      if (cleared.careerPhase === 'pro-season') {
        const pending = prepareProProgressCommit(cleared);
        await commitCareer(pending.save, pending.transition);
        return;
      }
      if (cleared.careerPhase === 'pro-offseason') {
        await commitCareer(cleared, () => setStep('pro-offseason'));
        return;
      }
      const pending = prepareYouthProgressCommit(cleared);
      await commitCareer(pending.save, pending.transition);
    } catch (caught) {
      setError(message(caught));
    }
  };
  const changePlan = async (plan: TrainingPlan) => {
    if (save) {
      await commitCareer(updateTrainingPlan(toApplicationSaveV5(save), plan), () => undefined);
    }
  };
  const handleEnterOffseason = async () => {
    if (!save) return;
    setError(null);
    try {
      const result = enterOffseason(toApplicationSaveV5(save), youthContent.academies);
      await commitCareer(result.save, () => setStep('offseason'));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleStartNextSeason = async (academyId?: string) => {
    if (!save) return;
    setError(null);
    try {
      const next = startNextYouthSeason(toApplicationSaveV5(save), youthContent, academyId);
      await commitCareer(next, () => {
        setReport(null);
        setOutcome(null);
        setStep('dashboard');
      });
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleSeekOffers = () => {
    if (!save) return;
    setError(null);
    setStep('agent');
  };
  const handleAgentPreferences = async (preferences: AgentPreferences) => {
    if (!save) return;
    setError(null);
    try {
      const withPrefs = submitAgentPreferences(toApplicationSaveV5(save), preferences);
      const withOffers = generateContractOffers(withPrefs, youthContent);
      await commitCareer(withOffers, () => setStep('offers'));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleSignContract = async (offerId: string) => {
    if (!save) return;
    setError(null);
    try {
      await commitCareer(signContract(toApplicationSaveV5(save), offerId), () => {
        setOutcome(null);
        setStep('dashboard');
      });
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleRejectOffers = async () => {
    if (!save) return;
    setError(null);
    try {
      const rejected = rejectOffers(toApplicationSaveV5(save));
      if (rejected.careerPhase === 'free-agent') {
        const withOffers = generateFreeAgentOffers(rejected, youthContent);
        await commitCareer(withOffers, () => setStep('free-agent'));
        return;
      }
      await commitCareer(rejected, () => setStep('offseason'));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleStartProSeason = async () => {
    if (!save) return;
    setError(null);
    try {
      const next = startProfessionalSeason(toApplicationSaveV5(save), professionalClubs);
      await commitCareer(next, () => {
        setReport(null);
        setStep('pro');
      });
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleAcceptRenewal = async () => {
    if (!save) return;
    setError(null);
    try {
      await commitCareer(acceptRenewal(toApplicationSaveV5(save)), () => undefined);
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleDeclineRenewal = async () => {
    if (!save) return;
    setError(null);
    setFreeAgentRetireConfirm(null);
    try {
      const free = declineRenewal(toApplicationSaveV5(save));
      const withOffers = generateFreeAgentOffers(free, youthContent);
      await commitCareer(withOffers, () => setStep('free-agent'));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleSignTransfer = async (offerId: string) => {
    if (!save) return;
    setError(null);
    setFreeAgentRetireConfirm(null);
    try {
      await commitCareer(signTransfer(toApplicationSaveV5(save), offerId), () =>
        setStep('dashboard'),
      );
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleRequestCareerMarket = async (kind: ContractOfferV3['offerKind']) => {
    if (!save) return;
    setError(null);
    try {
      await commitCareer(
        requestCareerMarket(toApplicationSaveV5(save), youthContent, kind),
        () => undefined,
      );
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleSignMarketOffer = async (offerId: string) => {
    if (!save) return;
    setError(null);
    setFreeAgentRetireConfirm(null);
    try {
      await commitCareer(signMarketOffer(toApplicationSaveV5(save), offerId), () => {
        setReport(null);
        setStep('dashboard');
      });
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleWaitWindow = async () => {
    if (!save) return;
    setError(null);
    setFreeAgentRetireConfirm(null);
    try {
      const withOffers = generateFreeAgentOffers(toApplicationSaveV5(save), youthContent);
      await commitCareer(withOffers, () => undefined);
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleEndYouthCareer = async () => {
    if (!save) return;
    setError(null);
    try {
      await commitCareer(endYouthCareer(save), () => setStep('retired'));
    } catch (caught) {
      setError(message(caught));
    }
  };
  const handleRetire = async (kind: FreeAgentRetireKind = 'voluntary-retirement') => {
    if (!save) return;
    setError(null);
    try {
      const date = careerEndDate(save);
      await commitCareer(endProfessionalCareer(save, date, kind), () => {
        setFreeAgentRetireConfirm(null);
        setStep('retired');
      });
    } catch (caught) {
      setError(message(caught));
    }
  };
  const openArchives = () => {
    cancelArchiveRequest();
    clearPendingCommit();
    setSave(null);
    setArchive(null);
    setBootstrapSave(null);
    setReport(null);
    setOutcome(null);
    setFreeAgentRetireConfirm(null);
    setStep('archives');
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
      <OfflineIndicator />
      {error && (
        <div role="alert" className="error-card">
          {error}
        </div>
      )}
      <SaveStatusIndicator state={commitState} onRetry={retryCommit} />
      {step === 'archives' && (
        <CareerSaveSelector
          records={records}
          academyNames={academyNames}
          busy={archiveBusy}
          onContinue={continueCareer}
          onCreate={createFromArchives}
          onDelete={deleteCareer}
          onExport={exportCareer}
        />
      )}
      {step !== 'archives' && (
        <fieldset
          disabled={isSaving}
          aria-busy={isSaving}
          style={{ border: 0, margin: 0, minInlineSize: 0, padding: 0 }}
        >
          {step === 'creation' && (
            <CareerCreationForm onComplete={start} content={bootstrapContent} />
          )}
          {step === 'opportunity' && bootstrapSave?.context.pendingOpportunity && (
            <YouthOpportunityPanel
              opportunity={bootstrapSave.context.pendingOpportunity}
              onChoose={chooseAcademy}
              disabled={isSaving}
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
                busy={isSaving}
                onAdvanceToNode={advanceToNode}
                onAdvanceOneMonth={advance}
                onTrainingPlanChange={changePlan}
                onOpenArchives={openArchives}
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
              canContinueYouth={canContinueYouth}
              canEndYouthCareer={canEndYouth}
              onStartNextSeason={handleStartNextSeason}
              onSeekOffers={handleSeekOffers}
              onEndYouthCareer={handleEndYouthCareer}
            />
          )}
          {step === 'agent' && save && <AgentPreferencesForm onSubmit={handleAgentPreferences} />}
          {step === 'offers' && save && save.pendingOffers.length > 0 && (
            <OfferComparisonPanel
              offers={save.pendingOffers}
              onSign={handleSignContract}
              onRejectAll={handleRejectOffers}
              rejectLabel={
                canContinueYouth ? '拒绝全部要约，留在青训' : '拒绝全部要约，进入职业市场'
              }
            />
          )}
          {step === 'pro' && save && (
            <ProDashboard
              save={save}
              report={report}
              advancing={advancing}
              busy={isSaving}
              onAdvanceToNode={advanceToNode}
              onAdvanceOneMonth={advance}
              onOpenArchives={openArchives}
              onTrainingPlanChange={changePlan}
              worldNewsItems={
                buildWorldNewsForCareer({
                  facts: worldFactsFromSave(save),
                  clubs: professionalClubs,
                  viewerClubId: save.proSeason?.clubId ?? null,
                  filter: {},
                  limit: 5,
                  cursor: null,
                }).items
              }
            />
          )}
          {step === 'pro-offseason' && save && (
            <ProOffseasonPanel
              save={save}
              onStartNextSeason={handleStartProSeason}
              onAcceptRenewal={handleAcceptRenewal}
              onDeclineRenewal={handleDeclineRenewal}
              onRetire={() => void handleRetire()}
              onTrainingPlanChange={changePlan}
              onRequestMarket={handleRequestCareerMarket}
              onSignMarketOffer={handleSignMarketOffer}
            />
          )}
          {step === 'free-agent' && save && (
            <section
              className="offseason"
              aria-label={save.clubHistory.length === 0 ? '职业市场' : '自由球员'}
            >
              {save.pendingOffers.length === 0 && (
                <SceneBanner
                  kind="locker-room"
                  eyebrow="职业市场 · 等待窗口"
                  title={save.clubHistory.length === 0 ? '职业市场' : '自由球员'}
                  detail="球员通道外的电话还没有响起；耐心、年龄和市场评价会共同影响下一份机会。"
                />
              )}
              {freeAgentRetireConfirm ? (
                <div
                  role="alertdialog"
                  aria-label={
                    freeAgentRetireConfirm === 'market-exit' ? '结束职业生涯确认' : '退役确认'
                  }
                >
                  <p>
                    {freeAgentRetireConfirm === 'market-exit'
                      ? '职业市场没有合适机会。确定要离开职业足坛吗？'
                      : '退役是不可逆的决定。确定要结束球员生涯吗？'}
                  </p>
                  <button onClick={() => void handleRetire(freeAgentRetireConfirm)}>
                    {freeAgentRetireConfirm === 'market-exit' ? '确认离开职业足坛' : '确认退役'}
                  </button>
                  <button onClick={() => setFreeAgentRetireConfirm(null)}>
                    {freeAgentRetireConfirm === 'market-exit' ? '继续寻找机会' : '继续职业生涯'}
                  </button>
                </div>
              ) : save.pendingOffers.length > 0 ? (
                <>
                  <OfferComparisonPanel
                    offers={save.pendingOffers}
                    onSign={handleSignTransfer}
                    onRejectAll={handleWaitWindow}
                    rejectLabel="暂不签约，等待下一个窗口"
                  />
                  <div className="offseason-actions">
                    <button
                      className="secondary-action"
                      onClick={() => setFreeAgentRetireConfirm('voluntary-retirement')}
                    >
                      宣布退役
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    {save.clubHistory.length === 0
                      ? '青训阶段已结束，当前没有俱乐部给出职业合同。'
                      : '转会市场暂时冷淡，没有俱乐部给出要约。'}
                  </p>
                  {save.freeAgentSeasons >= 2 && save.player.age < 30 && (
                    <p className="warning">你的市场价值正在下降，考虑接受更低的报价。</p>
                  )}
                  <div className="offseason-actions">
                    <button onClick={handleWaitWindow}>等待下一个转会窗口</button>
                    <button
                      className="secondary-action"
                      onClick={() => setFreeAgentRetireConfirm('market-exit')}
                    >
                      结束职业生涯
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
          {step === 'retired' &&
            (archive || save) &&
            (archive ? (
              <CareerReviewPage
                archive={archive}
                narrativeClient={localNarrativeClient ?? undefined}
                onOpenArchives={openArchives}
              />
            ) : (
              <CareerReviewPage
                save={save!}
                narrativeClient={localNarrativeClient ?? undefined}
                onOpenArchives={openArchives}
              />
            ))}
          {step === 'event' && save?.story.pendingEvent && (
            <>
              {save.monthlyAdvance.nodeAdvance && (
                <NodeBrief
                  brief={save.monthlyAdvance.nodeAdvance.brief}
                  skippedMonths={save.monthlyAdvance.nodeAdvance.skippedMonths}
                />
              )}
              <EventChoicePanel
                key={save.story.pendingEvent.eventId}
                event={save.story.pendingEvent}
                sceneKind={eventSceneKind}
                onSubmit={decide}
              />
            </>
          )}
          {step === 'event-feedback' && save?.story.pendingFeedback && (
            <EventFeedbackPanel
              feedback={save.story.pendingFeedback}
              nextEvents={pendingFeedbackNextEvents}
              sceneKind={eventSceneKind}
              onContinue={continueAfterEventFeedback}
              narrativeClient={localNarrativeClient ?? undefined}
              playerName={save.player.identity.name}
              nodeBrief={save.monthlyAdvance.nodeAdvance}
            />
          )}
        </fieldset>
      )}
    </main>
  );
}

const message = (caught: unknown) =>
  caught instanceof Error ? caught.message : '操作失败，请重试';

const toApplicationSaveV5 = (save: CareerSaveV7): CareerSaveV5Like => {
  if (save.careerEnd !== null) throw new Error('已结束的生涯不能继续操作');
  // 应用用例仍以 v5-like 结构接收输入，但保留 v7 字段和 schemaVersion。
  return save as unknown as CareerSaveV5Like;
};

const hydrateLoadedCareer = (save: CareerSaveV7): CareerSaveV7 => {
  if (save.careerEnd) return save;
  return migrateCareerSaveV7(createYouthCareerV2(save, youthContent));
};
const stepFor = (save: CareerSaveV7): Step => {
  if (save.careerPhase === 'retired') return 'retired';
  if (save.story.pendingFeedback) return 'event-feedback';
  if (save.story.pendingEvent) return 'event';
  if (save.careerPhase === 'offseason') return 'offseason';
  if (save.careerPhase === 'agent-preferences') return 'agent';
  if (save.careerPhase === 'offer-review') return 'offers';
  if (save.careerPhase === 'pro-season') return 'pro';
  if (save.careerPhase === 'pro-offseason') return 'pro-offseason';
  if (save.careerPhase === 'free-agent') return 'free-agent';
  return 'dashboard';
};
