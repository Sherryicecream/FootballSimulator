import { type CareerSave } from '@football/contracts';
import { chooseYouthOpportunity } from '@football/simulation';
import { type BootstrapContentPort } from '../ports/bootstrap-content';

/**
 * 创建提交青年选择的用例工厂
 * 验证并执行选择，返回更新后的存档
 */
export function createSubmitYouthChoice(_content: BootstrapContentPort) {
  return (save: CareerSave, offerId: string): CareerSave => {
    return chooseYouthOpportunity(save, offerId);
  };
}