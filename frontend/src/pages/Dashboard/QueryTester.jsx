import React, { useState } from 'react';
import api from '../../services/api';

const QueryTester = ({ onQuerySuccess }) => {
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // 벡엔드 의미론적 캐시 게이트웨이 호출
      const data = await api.post('/api/query', { query: queryText });
      setResult(data);

      // 질문 필드 비우기 (지속적인 입력 테스트 편의를 위해 지우거나 남겨둘 수 있으나 지우도록 유도)
      setQueryText('');

      // 대시보드 통계/이력 데이터의 실시간 동적 갱신을 트리거
      if (onQuerySuccess) {
        onQuerySuccess();
      }
    } catch (err) {
      console.error(err);
      setError('서버 연결 실패. 백엔드가 정상적으로 작동 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-box query-tester-card">
      <h2 className="section-title">실시간 쿼리 테스터</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <textarea
          className="query-input"
          placeholder="여기에 AI 모델에 전송할 질문을 입력하고 게이트웨이의 성능을 실시간 확인해보세요."
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          disabled={loading}
        ></textarea>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error && <span style={{ color: 'var(--danger-color)', fontSize: '0.9rem', fontWeight: 500 }}>{error}</span>}
          {!error && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>* 동일하거나 유사한 질문 시 캐시가 즉시 작동합니다.</span>}
          <button
            type="submit"
            className="query-submit-btn"
            disabled={loading || !queryText.trim()}
            style={{ opacity: loading || !queryText.trim() ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '전송 및 캐싱 분석 중.' : '질문 전송'}
          </button>
        </div>
      </form>

      {result && (
        <div className="query-result-section">
          <div className="result-header">
            <span className="result-label">의미론적 필터 응답 결과</span>
            <span className={`status-badge ${result.is_cache_hit ? 'success' : 'failed'}`} style={{ fontWeight: 700 }}>
              {result.is_cache_hit ? '⚡ Cache Hit' : '🌐 Cache Miss (API 호출)'}
            </span>
          </div>

          <div className="result-content">
            {result.response}
          </div>

          <div className="metrics-grid">
            <div className="metric-box">
              <div className="metric-label">지연 시간 (Latency)</div>
              <div className="metric-val" style={{ color: result.is_cache_hit ? 'var(--success-color)' : 'var(--text-primary)' }}>
                {result.response_time.toFixed(3)}s
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">의미적 유사도 (Similarity)</div>
              <div className="metric-val" style={{ color: result.is_cache_hit ? 'var(--success-color)' : 'var(--text-primary)' }}>
                {(result.similarity * 100).toFixed(1)}%
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">절감 비용 (Cost Saved)</div>
              <div className="metric-val" style={{ color: result.is_cache_hit ? 'var(--success-color)' : 'var(--text-primary)' }}>
                ${result.cost_saved.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryTester;
