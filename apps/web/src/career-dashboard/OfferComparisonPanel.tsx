import { useState } from 'react';
import type { ContractOfferV3 } from '@football/contracts';

interface OfferComparisonPanelProps {
  offers: ContractOfferV3[];
  onSign: (offerId: string) => void;
  onRejectAll: () => void;
}

const roleLabels: Record<ContractOfferV3['squadRole'], string> = {
  'youth-team': '青训队注册',
  rotation: '轮换球员',
  'first-team-rotation': '一线队轮换',
  'highlighted-prospect': '重点培养新星',
};

const promiseLabel = (offer: ContractOfferV3): string => {
  if (offer.promise.kind === 'playing-time') {
    return `出场承诺：至少 ${Math.round(offer.promise.minimumShare * 100)}% 出场时间`;
  }
  if (offer.promise.kind === 'position-guarantee') return '承诺培养对应位置';
  return '无特殊承诺';
};

export function OfferComparisonPanel({ offers, onSign, onRejectAll }: OfferComparisonPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = offers.find(({ id }) => id === selectedId) ?? null;

  return (
    <section className="offer-panel" aria-label="合同要约">
      <h2>经纪人的报价</h2>
      <div className="offer-list">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className={selectedId === offer.id ? 'offer-card selected' : 'offer-card'}
          >
            <h3>
              {offer.clubName}（层级 {offer.clubTier}）
            </h3>
            <ul>
              <li>年薪：{offer.salaryPerYear.toLocaleString('zh-CN')}</li>
              <li>期限：{offer.contractYears} 年</li>
              <li>队内角色：{roleLabels[offer.squadRole]}</li>
              <li>{promiseLabel(offer)}</li>
              {offer.releaseClauseNote && <li>{offer.releaseClauseNote}</li>}
            </ul>
            <button onClick={() => setSelectedId(offer.id)} disabled={selectedId === offer.id}>
              {selectedId === offer.id ? '已选择' : '选择这份要约'}
            </button>
          </article>
        ))}
      </div>

      {selected && (
        <div className="sign-confirm" role="alertdialog" aria-label="签署确认">
          <p>
            确认与 {selected.clubName} 签署 {selected.contractYears}{' '}
            年合同？签署是不可撤销的重大决定。
          </p>
          <button className="confirm" onClick={() => onSign(selected.id)}>
            确认签署
          </button>
          <button onClick={() => setSelectedId(null)}>再考虑一下</button>
        </div>
      )}

      <button className="reject-all" onClick={onRejectAll}>
        拒绝全部要约，留在青训
      </button>
    </section>
  );
}
