import type { RegionProfile } from '@football/contracts';

/**
 * 内容端口：提供地域档案查询
 * 由上层（web）实现具体数据源，应用层只依赖接口
 */
export interface BootstrapContentPort {
  getRegionProfile(id: string): RegionProfile | undefined;
}
