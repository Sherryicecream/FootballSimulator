import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { completeYouthSeason, enterOffseason } from '@football/application';
import { migrateCareerSaveV6, type ContractOfferV3 } from '@football/contracts';
import { AgentPreferencesForm } from '../../src/career-dashboard/AgentPreferencesForm';
import { OfferComparisonPanel } from '../../src/career-dashboard/OfferComparisonPanel';
import { ContractCard } from '../../src/career-dashboard/ContractCard';
import { OffseasonBriefing } from '../../src/career-dashboard/OffseasonBriefing';
import { ProOffseasonPanel } from '../../src/career-dashboard/ProOffseasonPanel';
import {
  academies,
  createSave,
  finishSeason,
} from '../../../../packages/application/tests/fixtures/youth-save';

const offers: ContractOfferV3[] = [
  {
    id: 'offer-a',
    clubId: 'club-a',
    clubName: '云梦泽畔',
    clubTier: 4,
    salaryPerYear: 9000,
    contractYears: 3,
    squadRole: 'rotation',
    promise: { kind: 'playing-time', minimumShare: 0.5 },
    releaseClauseNote: '',
  },
  {
    id: 'offer-b',
    clubId: 'club-b',
    clubName: '申海港联',
    clubTier: 8,
    salaryPerYear: 15000,
    contractYears: 2,
    squadRole: 'first-team-rotation',
    promise: { kind: 'none' },
    releaseClauseNote: '附带降级解约条款：球队降级时可按约定条件解约',
  },
];
const loanOffer: ContractOfferV3 = {
  ...offers[0]!,
  id: 'loan-offer-a',
  clubId: 'loan-club-a',
  clubName: '镜湖潮汐',
  offerKind: 'loan',
  contractYears: 1,
};

const finalYouthOffseason = () => {
  const completedSeason = finishSeason(createSave(42));
  const finalYouthSeason = {
    ...completedSeason,
    player: {
      ...completedSeason.player,
      age: 20,
      identity: { ...completedSeason.player.identity, dateOfBirth: '2005-01-01' },
    },
  };
  const completed = completeYouthSeason(finalYouthSeason);
  const offseason = enterOffseason(completed.save, academies).save;
  return migrateCareerSaveV6({
    ...offseason,
    offseason: { ...offseason.offseason!, graduationEligible: false },
  });
};

const age22ProfessionalOffseason = () => {
  const save = migrateCareerSaveV6(createSave(99));
  return {
    ...save,
    careerPhase: 'pro-offseason' as const,
    player: { ...save.player, age: 22 },
  };
};

describe('AgentPreferencesForm', () => {
  it('提交经纪人倾向', () => {
    const onSubmit = vi.fn();
    render(<AgentPreferencesForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByLabelText('优先稳定出场的低层级'));
    fireEvent.click(screen.getByLabelText('薪资待遇'));
    fireEvent.click(screen.getByRole('button', { name: '等待经纪人的报价' }));
    expect(onSubmit).toHaveBeenCalledWith({ leagueTierBias: 'low', priority: 'salary' });
  });
});

describe('OfferComparisonPanel', () => {
  it('展示全部要约并支持二次确认后签署', () => {
    const onSign = vi.fn();
    render(<OfferComparisonPanel offers={offers} onSign={onSign} onRejectAll={vi.fn()} />);
    expect(screen.getByText('云梦泽畔（实力档位 4）')).toBeVisible();
    expect(screen.getByText('申海港联（实力档位 8）')).toBeVisible();
    expect(screen.getByText(/出场承诺：至少 50%/)).toBeVisible();
    expect(screen.getAllByText(/降级解约条款/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: '选择这份要约' })[0]!);
    expect(screen.getByRole('alertdialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '确认签署' }));
    expect(onSign).toHaveBeenCalledWith('offer-a');
  });

  it('取消确认后不会签署', () => {
    const onSign = vi.fn();
    render(<OfferComparisonPanel offers={offers} onSign={onSign} onRejectAll={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: '选择这份要约' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: '再考虑一下' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onSign).not.toHaveBeenCalled();
  });

  it('拒绝全部要约回调 onRejectAll', () => {
    const onRejectAll = vi.fn();
    render(<OfferComparisonPanel offers={offers} onSign={vi.fn()} onRejectAll={onRejectAll} />);
    fireEvent.click(screen.getByRole('button', { name: '拒绝全部要约，留在青训' }));
    expect(onRejectAll).toHaveBeenCalledTimes(1);
  });
});

describe('ContractCard', () => {
  it('展示租借类别、合同归属、回归时间和预计角色', () => {
    const onSign = vi.fn();
    render(
      <OfferComparisonPanel
        offers={[loanOffer]}
        marketMode="loan"
        onSign={onSign}
        onRejectAll={vi.fn()}
      />,
    );

    expect(screen.getByText('租借')).toBeVisible();
    expect(screen.getByText('合同仍归母队')).toBeVisible();
    expect(screen.getByText('赛季末自动回归')).toBeVisible();
    expect(screen.getByText(/预计角色：轮换球员/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '选择这份租借' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('确认签署租借');
  });

  it('展示合同关键信息', () => {
    render(
      <ContractCard
        contract={{
          ...offers[1]!,
          signedOn: '2027-07-01',
          seasonsCompleted: 1,
          promiseStatus: 'kept',
        }}
      />,
    );
    expect(screen.getByText(/申海港联（实力档位 8）/)).toBeVisible();
    expect(screen.getByText(/剩余 1 年/)).toBeVisible();
    expect(screen.getByText(/无特殊承诺：已兑现/)).toBeVisible();
  });
});

describe('terminal career actions', () => {
  it('offers an explicit ending instead of a dead end after the final youth window', () => {
    const onEndYouthCareer = vi.fn();
    render(
      <OffseasonBriefing
        save={finalYouthOffseason()}
        outcome={{
          status: 'retained',
          nextPath: 'professional-market',
          signals: [],
          summary: '青训年龄窗口已关闭。',
        }}
        academies={academies}
        canContinueYouth={false}
        canEndYouthCareer={true}
        onEndYouthCareer={onEndYouthCareer}
      />,
    );

    expect(screen.getByRole('button', { name: '结束青训生涯' })).toBeVisible();
    expect(screen.queryByText('本赛季已是青训阶段的最后窗口，请先处理职业市场机会。')).toBeNull();
  });

  it('does not infer a youth ending action from its callback alone', () => {
    render(
      <OffseasonBriefing
        save={finalYouthOffseason()}
        outcome={{
          status: 'retained',
          nextPath: 'professional-market',
          signals: [],
          summary: '青训年龄窗口已关闭。',
        }}
        academies={academies}
        canContinueYouth={false}
        canEndYouthCareer={false}
        onEndYouthCareer={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: '结束青训生涯' })).toBeNull();
    expect(screen.getByText('本赛季已是青训阶段的最后窗口，请先处理职业市场机会。')).toBeVisible();
  });

  it('allows a professional under 30 to open but cancel retirement confirmation', () => {
    const onRetire = vi.fn();
    render(
      <ProOffseasonPanel
        save={age22ProfessionalOffseason()}
        onRetire={onRetire}
        onStartNextSeason={vi.fn()}
        onAcceptRenewal={vi.fn()}
        onDeclineRenewal={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '宣布退役' }));
    expect(screen.getByRole('alertdialog', { name: '退役确认' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '继续职业生涯' }));
    expect(onRetire).not.toHaveBeenCalled();
  });

  it('confirms professional retirement without forwarding the click event', () => {
    const onRetire = vi.fn();
    render(
      <ProOffseasonPanel
        save={age22ProfessionalOffseason()}
        onRetire={onRetire}
        onStartNextSeason={vi.fn()}
        onAcceptRenewal={vi.fn()}
        onDeclineRenewal={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '宣布退役' }));
    fireEvent.click(screen.getByRole('button', { name: '确认退役' }));

    expect(onRetire).toHaveBeenCalledWith();
  });
});
