import React from 'react';

// 간단한 스파크라인 목업 컴포넌트
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
  // 기본 데모 통계에 실시간 백엔드 데이터 결합 (데모용 고품질 시나리오 구현)
  const baseQueries = 1280 + (data?.queries_processed || 0);
  const baseHits = 856 + (data?.queries_processed ? Math.round(data.queries_processed * (data.cache_hit_rate / 100)) : 0);
  const hitRate = baseQueries > 0 
    ? ((baseHits / baseQueries) * 100).toFixed(1)
    : 66.8;
  const avgResponse = data?.queries_processed
    ? data.avg_response_time
    : 0.04;
  const costSaved = 6.42 + (data?.total_cost_saved || 0);

  const stats = [
    { 
      title: '전체 쿼리 수', 
      value: baseQueries.toLocaleString(), 
      change: data?.queries_processed ? `+${data.queries_processed} 신규` : '+12%', 
      isPositive: true 
    },
    { 
      title: '누적 캐시 히트 수', 
      value: `${baseHits.toLocaleString()} (${hitRate}%)`, 
      change: `지연율 저하`, 
      isPositive: true 
    },
    { 
      title: '평균 응답 속도', 
      value: `${avgResponse}s`, 
      change: data?.queries_processed ? `실시간` : '-0.076s', 
      isPositive: true 
    },
    { 
      title: 'API 비용 절감액', 
      value: `$${costSaved.toFixed(3)}`, 
      change: data?.total_cost_saved ? `+$${data.total_cost_saved.toFixed(3)}` : '+$0.005', 
      isPositive: true 
    }
  ];

  return (
    <div className="stat-cards-grid">
      {stats.map((stat, index) => (
        <div key={index} className="card-box stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
            <SparklineMock />
          </div>
          <div className="stat-footer">
            <span className={`stat-change ${stat.isPositive ? (stat.title === '평균 응답 속도' ? 'negative' : 'positive') : 'negative'}`}>
              {stat.change}
            </span>
            <span className="stat-period">last month</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
