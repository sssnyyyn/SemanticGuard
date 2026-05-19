import React from 'react';
import './LogDetailModal.css';

const LogDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className={`modal-status-badge ${log.status === '실패' ? 'failed' : log.is_cache_hit ? 'hit' : 'miss'}`}>
              {log.status === '실패' ? '실패' : log.is_cache_hit ? '⚡ 캐시히트' : '🌐 API호출'}
            </span>
            <span className="modal-title-id">로그 상세 분석 #{log.id}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="modal-timestamp-row">
            <strong>기록 시간:</strong> {log.timestamp}
          </div>

          <div className="detail-section">
            <h4 className="detail-label">질문 내용 (User Query)</h4>
            <div className="detail-value-box query-box">{log.query}</div>
          </div>

          <div className="detail-section">
            <h4 className="detail-label">답변 내용 (Response)</h4>
            <div className="detail-value-box response-box">
              {log.response || "답변 데이터가 존재하지 않습니다."}
            </div>
          </div>

          {log.status === '실패' && (
            <div className="detail-section failed-reason-section">
              <h4 className="detail-label text-danger">장애 원인 진단</h4>
              <div className="detail-value-box failed-box">
                API 엔드포인트 연결 시간 초과 (Timeout) 또는 내부 LLM 오류가 발생했습니다. 백엔드 연결 상태를 점검하십시오.
              </div>
            </div>
          )}

          <div className="modal-metrics-grid">
            <div className="modal-metric-box">
              <span className="modal-metric-title">유사도</span>
              <span className="modal-metric-value">{(log.similarity * 100).toFixed(1)}%</span>
              <span className="modal-metric-desc">{log.is_cache_hit ? '임계치 초과 적중' : '유사도 미달'}</span>
            </div>
            <div className="modal-metric-box">
              <span className="modal-metric-title">응답 속도</span>
              <span className="modal-metric-value">{log.response_time.toFixed(3)}s</span>
              <span className="modal-metric-desc">
                {log.is_cache_hit ? '95%+ 속도 단축' : '실시간 API 호출'}
              </span>
            </div>
            <div className="modal-metric-box">
              <span className="modal-metric-title">비용 절감</span>
              <span className="modal-metric-value text-success">${log.cost_saved.toFixed(4)}</span>
              <span className="modal-metric-desc">누적 비용 절감 기여</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogDetailModal;
