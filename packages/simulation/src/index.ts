export type {
  CareerGoal,
  CareerGoalStatus,
  CareerReplayMoment,
  CareerReplayMomentKind,
  CareerReviewData,
} from './career/career-review';
export { createSeededRandomSource } from './randomness';
export type { SeededRandomSource } from './randomness';
export { createPlayer } from './player-development/player-factory';
export type { CreatePlayerParams } from './player-development/player-factory';
export { simulateTraining } from './player-development/training';
export {
  createCalendar,
  advanceOneWeek,
  advanceToNextMonth,
  getSeasonWeekRange,
} from './career/calendar';
export type { CalendarState } from './career/calendar';
export { generateYouthOpportunity, chooseYouthOpportunity } from './career/youth-opportunity';
export { generateWeekActivity } from './career/week-activities';
export type { WeekActivityResult } from './career/week-activities';
export { initializePlayerState } from './career/initial-state';
export { advanceCareerWeek } from './career/weekly-advance';
export { pickEventForWeek } from './career/event-integration';
export { pickYouthEventForWeek } from './career/event-integration';
export {
  buildMatchMomentEvent,
  isImportantMatchContext,
} from './career/match-moment';
export type { YouthEventPickResult } from './career/event-integration';
export { simulateMatch } from './match/match-engine';
export { simulateYouthMatch } from './match/youth-match';
export type { YouthMatchOpponent } from './match/youth-match';
export {
  accrueWeeklyDevelopment,
  mergeDevelopmentAccrual,
  settleMonthlyDevelopment,
} from './player-development/development';
export type { AttributeKey, DevelopmentAccrual } from './player-development/development';
export { simulateInjuryRisk } from './health/injury-model';
export { simulateScheduledYouthMatch } from './match/scheduled-youth-match';
export { deriveAge, simulateYouthWeek } from './career/simulate-youth-week';
export type { YouthWeekTransition } from './career/simulate-youth-week';
export { buildTrainingFeedback } from './career/training-feedback';
export type { TrainingFeedbackInput } from './career/training-feedback';
export { deriveDevelopmentSignals } from './career/development-signals';
export type { DevelopmentSignal } from './career/development-signals';
export { advanceFirstTeamPathway } from './first-team/pathway';
export type { FirstTeamPathwayResult } from './first-team/pathway';
export { createLeagueStandings, updateStandings, getStandings } from './world/league-season';
export { filterEligibleEvents, selectEvent } from './events/event-selector';
export { filterEligibleYouthEvents } from './events/event-selector';
export { calculateYouthEventWeight, selectYouthEvent } from './events/event-selector';
export type { PlayerContext } from './events/event-selector';
export {
  createPerson,
  updateRelationship,
  addMemory,
  getRelationshipLabel,
} from './relationships/relationship-manager';
export { generateCoach, generateTeammates } from './relationships/initial-people';
export { initializeYouthRelationships } from './relationships/youth-relationships';
export { applyRelationshipEffects } from './relationships/relationship-effects';
export type { RelationshipEffects } from './relationships/relationship-effects';
export { renderTemplate, generateEventNarrative } from './events/narrative';
export { buildEventFeedback } from './events/event-feedback';
export { resolveChoiceOutcome } from './events/choice-resolution';
export type {
  ChoiceOutcomeResolution,
  ResolveChoiceOutcomeInput,
} from './events/choice-resolution';
export { selectEventNarrativeVariant } from './events/narrative-variants';
export type { NarrativeVariantKey, SelectedNarrativeVariant } from './events/narrative-variants';
export { buildMonthlyMomentum } from './career/monthly-momentum';
export { buildMatchdayMoments } from './career/matchday-moments';
export { buildStoryProgress } from './career/story-progress';
export { evaluateOffseason } from './career/evaluate-offseason';
export {
  evaluateGraduationEligibility,
  weightedAbility,
  graduationAbilityThreshold,
} from './career/graduation';
export { MAX_YOUTH_AGE, isFinalYouthSeason, canStartNextYouthSeason } from './career/youth-age';
export { startNextSeason, createYouthFixtures } from './career/start-next-season';
export { generateOffers } from './career/offer-generation';
export type { GenerateOffersOptions, MarketPerformanceSnapshot } from './career/offer-generation';
export { createLeagueFixtures } from './career/league-fixtures';
export { createDomesticCup, advanceDomesticCup } from './career/domestic-cup';
export { generateProSquad, buildDepthChart, depthRank } from './career/pro-squad';
export { simulateProfessionalWeek, decideAppearance } from './career/professional-week';
export { reviewPromise, evaluateProRole, buildRenewalOffer } from './career/promise-review';
export { growthAgeFactor, applyAgeDecline } from './career/age-curve';
export { generateProfessionalMarketOffers, generateTransferOffers } from './career/transfer-offers';
export type { TransferMarketKind } from './career/transfer-offers';
export { isEligibleForNationalTeam, accrueNationalTeam } from './career/national-team';
export { buildCareerReview } from './career/career-review';
