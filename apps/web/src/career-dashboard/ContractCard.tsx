import type { SignedContract } from '@football/contracts';
import { FootballGlyph } from '../design-system/FootballGlyph';

interface ContractCardProps {
  contract: SignedContract;
}

const roleLabels: Record<SignedContract['squadRole'], string> = {
  'youth-team': '青训队注册',
  rotation: '轮换球员',
  'first-team-rotation': '一线队轮换',
  'highlighted-prospect': '重点培养新星',
};

const promiseLabel = (contract: SignedContract): string => {
  if (contract.promise.kind === 'playing-time') {
    return `出场承诺（至少 ${Math.round(contract.promise.minimumShare * 100)}%）`;
  }
  if (contract.promise.kind === 'position-guarantee') return '位置培养承诺';
  return '无特殊承诺';
};

const promiseStatusLabels: Record<SignedContract['promiseStatus'], string> = {
  pending: '尚未检验',
  kept: '已兑现',
  broken: '未兑现',
};

export function ContractCard({ contract }: ContractCardProps) {
  return (
    <section className="contract-card" aria-label="职业合同">
      <div className="contract-card-heading">
        <FootballGlyph name="locker-room" size={19} />
        <h3>职业合同</h3>
      </div>
      <ul>
        <li>
          俱乐部：{contract.clubName}（实力档位 {contract.clubTier}）
        </li>
        <li>签署日期：{contract.signedOn}</li>
        <li>
          期限：{contract.contractYears} 年（剩余{' '}
          {contract.contractYears - contract.seasonsCompleted} 年）
        </li>
        <li>年薪：{contract.salaryPerYear.toLocaleString('zh-CN')} 游戏币/年</li>
        <li>队内角色：{roleLabels[contract.squadRole]}</li>
        <li>
          {promiseLabel(contract)}：{promiseStatusLabels[contract.promiseStatus]}
        </li>
        {contract.releaseClauseNote && <li>{contract.releaseClauseNote}</li>}
      </ul>
    </section>
  );
}
