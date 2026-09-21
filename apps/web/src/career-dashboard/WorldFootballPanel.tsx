import type { ClubProfile, WorldNewsItem } from '@football/contracts';

type WorldFootballPanelProps = {
  items?: readonly WorldNewsItem[];
  clubs: readonly ClubProfile[];
};

const countryLabels: Record<string, string> = {
  china: '中国',
  england: '英格兰',
  spain: '西班牙',
  germany: '德国',
  italy: '意大利',
  france: '法国',
  japan: '日本',
  korea: '韩国',
};

const categoryLabels: Record<WorldNewsItem['category'], string> = {
  domestic: '国内赛季',
  continental: '洲际赛事',
  transfer: '转会',
  rumour: '传闻',
  injury: '伤病',
  milestone: '里程碑',
};

export function WorldFootballPanel({ items = [], clubs }: WorldFootballPanelProps) {
  const clubById = new Map(clubs.map((club) => [club.id, club]));
  const visibleItems = items.slice(0, 5);

  return (
    <section className="dashboard-card world-football-panel" aria-label="世界足坛">
      <div className="card-heading">
        <span className="card-kicker">世界动态</span>
        <h3>世界足坛</h3>
      </div>
      <p className="world-football-intro">来自已结算赛季、洲际赛事与转会事实的近期动态。</p>
      {visibleItems.length === 0 ? (
        <p className="muted">暂无已结算的世界足坛动态。</p>
      ) : (
        <ul className="world-news-list">
          {visibleItems.map((item) => {
            const club = clubById.get(item.relatedClubIds[0] ?? '');
            return (
              <li key={item.id} className="world-news-item">
                <div className="world-news-heading">
                  <strong>{item.title}</strong>
                  <span>{item.occurredOn}</span>
                </div>
                <p>{item.summary}</p>
                <small>
                  {club
                    ? `${countryLabels[club.country ?? ''] ?? club.country ?? '未知国家'} · 联赛第 ${club.tier} 级`
                    : '俱乐部资料暂不可用'}{' '}
                  · {categoryLabels[item.category]}
                </small>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
