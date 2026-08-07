import { type CareerSave } from '@football/contracts';
import {
  advanceOneWeek,
  generateYouthOpportunity,
  createCalendar,
  createSeededRandomSource,
} from '@football/simulation';
import { type BootstrapContentPort } from '../ports/bootstrap-content';

/**
 * 创建推进到决策的用例工厂
 * 反复推进周，直到出现一个待处理的青年机会
 */
export function createAdvanceToDecision(content: BootstrapContentPort) {
  return (initialSave: CareerSave): CareerSave => {
    const regionId = initialSave.player.identity.homelandId;
    const region = content.getRegionProfile(regionId);
    if (!region) {
      throw new Error(`Unknown homeland: ${regionId}`);
    }

    let save = initialSave;
    const maxWeeks = 12;

    for (let week = 1; week <= maxWeeks; week++) {
      // 检查是否到了机会出现周
      if (week === save.story.bootstrapOpportunityWeek) {
        const rng = createSeededRandomSource(save.randomState.seed + week);
        const opportunity = generateYouthOpportunity(
          save,
          region,
          content.getYouthAcademies(),
          rng,
          week,
        );

        // 更新日历
        const calendar = createCalendar(save.world.currentDate, save.world.season);
        const advanced = advanceOneWeek({
          currentDate: calendar.currentDate,
          season: calendar.season,
          weekNumber: week - 1,
          month: calendar.month,
        });

        // 添加周推进账本和机会
        save = {
          ...save,
          world: {
            currentDate: advanced.currentDate,
            season: advanced.season,
            weekNumber: advanced.weekNumber,
          },
          context: {
            ...save.context,
            pendingOpportunity: opportunity,
          },
          ledger: [
            ...save.ledger,
            {
              type: 'week-advanced' as const,
              date: advanced.currentDate,
              week: advanced.weekNumber,
            },
          ],
        };

        return save;
      }

      // 普通周推进
      const calendar = createCalendar(save.world.currentDate, save.world.season);
      const advanced = advanceOneWeek({
        currentDate: calendar.currentDate,
        season: calendar.season,
        weekNumber: week - 1,
        month: calendar.month,
      });

      save = {
        ...save,
        world: {
          currentDate: advanced.currentDate,
          season: advanced.season,
          weekNumber: advanced.weekNumber,
        },
        ledger: [
          ...save.ledger,
          { type: 'week-advanced' as const, date: advanced.currentDate, week: advanced.weekNumber },
        ],
      };
    }

    throw new Error('超过最大推进周数（12周），存档状态可能已损坏');
  };
}
