import React from 'react';

const SparklineMock = () => {
  const heights = [30, 50, 40, 70, 60, 90, 80, 100];
  return (
    <div className="stat-sparkline">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`spark-bar ${i > 4 ? 'active' : ''}`}
          style={{ height: `${h}%` }}
        ></div>
      ))}
    </div>
  );
};

const StatCards = ({ data }) => {
  const totalQueries = data?.queries_processed || 0;
  const totalHits = data?.cache_hits || 0;
  const hitRate = data?.cache_hit_rate !== undefined ? data.cache_hit_rate : 0.0;
  const avgResponse = data?.avg_response_time !== undefined ? data.avg_response_time : 0.0;
  const costSaved = data?.total_cost_saved || 0.0;

  const qChange = data?.changes?.queries || '0.0%';
  const hChange = data?.changes?.hits || '0.0%';
  const lChange = data?.changes?.latency || '0.0%';
  const sChange = data?.changes?.savings || '$0.0000';

  const stats = [
    {
      title: '전체 쿼리 수',
      value: totalQueries.toLocaleString(),
      change: qChange,
      subText: 'yesterday'
    },
    {
      title: '누적 캐시 히트 수',
      value: `${totalHits.toLocaleString()} (${hitRate}%)`,
      change: hChange,
      subText: 'yesterday'
    },
    {
      title: '평균 응답 속도',
      value: `${avgResponse.toFixed(3)}s`,
      change: lChange,
      subText: 'yesterday'
    },
    {
      title: 'API 비용 절감액',
      value: `$${costSaved.toFixed(4)}`,
      change: sChange,
      subText: 'yesterday'
    }
  ];

  return (
    <div className="stat-cards-grid">
      {stats.map((stat, index) => {
        const hasPlus = stat.change.includes('+');
        const hasMinus = stat.change.includes('-');

        let changeClass = 'neutral';
        if (hasPlus) {
          changeClass = 'positive';
        } else if (hasMinus) {
          changeClass = 'negative';
        }

        return (
          <div key={index} className="card-box stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-title">{stat.title}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
              <SparklineMock />
            </div>
            <div className="stat-footer">
              <span className={`stat-change ${changeClass}`}>
                {stat.change}
              </span>
              <span className="stat-period">{stat.subText}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
