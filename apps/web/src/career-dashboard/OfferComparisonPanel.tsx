import { useState } from 'react';
import { SceneBanner } from '../design-system/SceneBanner';
import type { ContractOfferV3 } from '@football/contracts';

interface OfferComparisonPanelProps {
  offers: ContractOfferV3[];
  onSign: (offerId: string) => void;
  onRejectAll: () => void;
  rejectLabel?: string;
  marketMode?: ContractOfferV3['offerKind'];
}

const roleLabels: Record<ContractOfferV3['squadRole'], string> = {
  'youth-team': '青训队注册',
  rotation: '轮换球员',
  'first-team-rotation': '一线队轮换',
  'highlighted-prospect': '重点培养新星',
};

const salaryLabel = (salary: number): string => salary.toLocaleString('zh-CN') + ' 游戏币/年';

const promiseLabel = (offer: ContractOfferV3): string => {
  if (offer.promise.kind === 'playing-time') {
    return `出场承诺：至少 ${Math.round(offer.promise.minimumShare * 100)}% 出场时间`;
  }
  if (offer.promise.kind === 'position-guarantee') return '承诺培养对应位置';
  return '无特殊承诺';
};

export function OfferComparisonPanel({
  offers,
  onSign,
  onRejectAll,
  rejectLabel = '拒绝全部要约，留在青训',
  marketMode,
}: OfferComparisonPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = offers.find(({ id }) => id === selectedId) ?? null;
  const selectedKind = selected?.offerKind ?? marketMode ?? 'permanent';

  return (
    <section className="offer-panel" aria-label="合同要约">
      <SceneBanner
        kind="locker-room"
        eyebrow="职业市场 · 谈判桌"
        title={marketMode === 'loan' ? '租借机会' : '经纪人的报价'}
        detail="每一份合同都代表不同的出场路径、成长速度和风险承担。"
      />
      <div className="offer-list">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className={`offer-card ${offer.offerKind ?? marketMode ?? 'permanent'}${selectedId === offer.id ? ' selected' : ''}`}
          >
            <div className="offer-card-heading">
              <h3>
                {offer.clubName}（实力档位 {offer.clubTier}）
              </h3>
              <span className="market-kind">
                {(offer.offerKind ?? marketMode ?? 'permanent') === 'loan' ? '租借' : '永久转会'}
              </span>
            </div>
            <ul>
              <li>年薪：{salaryLabel(offer.salaryPerYear)}</li>
              <li>期限：{offer.contractYears} 年</li>
              <li>预计角色：{roleLabels[offer.squadRole]}</li>
              <li>{promiseLabel(offer)}</li>
              {(offer.offerKind ?? marketMode ?? 'permanent') === 'loan' && (
                <>
                  <li>合同仍归母队</li>
                  <li>赛季末自动回归</li>
                </>
              )}
              {offer.releaseClauseNote && <li>{offer.releaseClauseNote}</li>}
            </ul>
            <button onClick={() => setSelectedId(offer.id)} disabled={selectedId === offer.id}>
              {selectedId === offer.id
                ? '已选择'
                : (offer.offerKind ?? marketMode ?? 'permanent') === 'loan'
                  ? '选择这份租借'
                  : '选择这份要约'}
            </button>
          </article>
        ))}
      </div>

      {selected && (
        <div className="sign-confirm" role="alertdialog" aria-label="签署确认">
          <p>
            {selectedKind === 'loan'
              ? `确认与 ${selected.clubName} 签署租借 ${selected.contractYears} 年合同？合同仍归母队，赛季末自动回归。`
              : `确认与 ${selected.clubName} 签署 ${selected.contractYears} 年合同？签署是不可撤销的重大决定。`}
          </p>
          <button className="confirm" onClick={() => onSign(selected.id)}>
            {selectedKind === 'loan' ? '确认签署租借' : '确认签署'}
          </button>
          <button onClick={() => setSelectedId(null)}>再考虑一下</button>
        </div>
      )}

      <button className="reject-all" onClick={onRejectAll}>
        {rejectLabel}
      </button>
    </section>
  );
}
