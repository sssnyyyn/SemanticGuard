import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Settings.css';

const Settings = () => {
  const [threshold, setThreshold] = useState(0.75);
  const [sysInfo, setSysInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState('');
  const [clearMsg, setClearMsg] = useState('');

  const fetchSettings = async () => {
    try {
      const data = await api.get('/api/settings');
      if (data) {
        setThreshold(data.similarity_threshold);
        setSysInfo(data);
      }
    } catch (err) {
      console.error('설정 정보 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.post('/api/settings', { similarity_threshold: threshold });
      setMsg('⚙️ 임계치 설정이 실시간으로 안전하게 반영되었습니다!');
      setTimeout(() => setMsg(''), 3000);
      fetchSettings();
    } catch (err) {
      console.error(err);
      setMsg('❌ 설정 저장 중 에러가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    const confirmClear = window.confirm(
      '⚠️ [위험] 정말로 로컬 FAISS 벡터 인덱스 및 대시보드 관제 로그를 완전히 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
    );
    if (!confirmClear) return;

    setClearing(true);
    setClearMsg('');
    try {
      const resp = await api.post('/api/cache/clear');
      setClearMsg(`🧹 ${resp.message || '캐시가 성공적으로 청소되었습니다.'}`);
      setTimeout(() => setClearMsg(''), 4000);
      fetchSettings();
    } catch (err) {
      console.error(err);
      setClearMsg('❌ 캐시 초기화 작업 도중 오류가 발생했습니다.');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return <div className="settings-loading">설정 데이터를 불러오는 중..</div>;
  }

  return (
    <div className="settings-container">
      {/* 1열: 좌측 임계치 설정 & 우측 로컬 인덱스 상태 모니터링 (Grid 구성) */}
      <div className="settings-grid-1row">
        
        {/* 1열 1행: 의미론적 유사도 캐시 설정 */}
        <div className="card-box settings-card">
          <h2 className="settings-section-title">의미론적 유사도 캐시 설정</h2>
          <p className="settings-desc">
            의미론적 캐싱 알고리즘의 유사도 판단 기준선(Threshold)을 실시간 조작합니다.
            임계치를 높이면 질문이 거의 완벽히 일치해야 캐시가 적용(엄격 모드)되며, 
            낮추면 유연하게 넓은 의미의 캐시 응답이 적용(유연 모드)됩니다.
          </p>
          
          <div className="slider-wrapper">
            <div className="slider-limits">
              <span>0% (전체 캐시 히트 허용)</span>
              <span>100% (완전 일치 검증)</span>
            </div>
            <div className="slider-control-row">
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="settings-slider"
              />
              <div className="threshold-badge">
                {(threshold * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="settings-footer">
            <button
              onClick={handleSave}
              className="settings-save-btn"
              disabled={saving}
            >
              {saving ? '적용 중..' : '임계치 실시간 저장'}
            </button>
            {msg && (
              <span className={`settings-msg ${msg.includes('❌') ? 'error' : 'success'}`}>
                {msg}
              </span>
            )}
          </div>
        </div>

        {/* 1열 2행: 로컬 임베딩 인덱스 모니터링 및 초기화 */}
        {sysInfo && (
          <div className="card-box info-card">
            <h2 className="settings-section-title">로컬 임베딩 인덱스 모니터링</h2>
            <p className="settings-desc">
              로컬에 물리 보관 및 저장된 FAISS 백업 인덱스의 활성 및 동기화 상태를 계측합니다.
            </p>

            <div className="index-monitor-specs">
              <div className="spec-row">
                <span className="spec-label">마지막 인덱스 갱신일</span>
                <span className="spec-value highlight-val">{sysInfo.last_updated_at}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">적용 의미론적 임베딩 모델</span>
                <span className="spec-value">{sysInfo.embedding_model}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">인덱싱된 총 벡터 개수</span>
                <span className="spec-value font-mono">{sysInfo.vector_count} 개</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">인덱스 데이터 차원</span>
                <span className="spec-value">{sysInfo.dimension} Dimension</span>
              </div>
            </div>

            <div className="warning-reset-section">
              <p className="warning-text">
                ⚠️ <strong>위험:</strong> 캐시 초기화 시 FAISS 벡터 인덱스 내 누적된 모든 의미적 유사 매핑 쌍과 대시보드 관제 이력 로그가 안전 격리 상태에서 소멸하며, 소멸 후에는 절대로 복구할 수 없습니다.
              </p>
              <div className="reset-btn-row">
                <button
                  onClick={handleClearCache}
                  className="settings-clear-btn"
                  disabled={clearing}
                >
                  {clearing ? '인덱싱 비우는 중...' : '캐시 전체 초기화'}
                </button>
                {clearMsg && (
                  <span className={`settings-msg ${clearMsg.includes('❌') ? 'error' : 'success'}`}>
                    {clearMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2열: 업스트림 모델 연결 상태 (Full Width) */}
      {sysInfo && sysInfo.upstream && (
        <div className="card-box upstream-card" style={{ marginTop: '24px' }}>
          <h2 className="settings-section-title">업스트림 모델 연결 상태 (Upstream Hub)</h2>
          <p className="settings-desc">
            캐시 미스 시 구동되는 상위 클라우드 LLM 추론 서버 및 로컬 백업 엔드포인트의 통신 맥동 상태를 감시합니다.
          </p>
          
          <div className="upstream-table-wrapper">
            <table className="upstream-table">
              <thead>
                <tr>
                  <th>인프라 구분</th>
                  <th>엔드포인트 및 가동 모델</th>
                  <th>실측 평균 레이턴시</th>
                  <th>연결 맥동 상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="infra-type">Primary Engine (기본)</td>
                  <td className="infra-url font-mono">{sysInfo.upstream.primary_endpoint}</td>
                  <td className="infra-latency">{sysInfo.upstream.avg_latency}</td>
                  <td className="infra-status">
                    <span className="status-indicator active"></span>
                    <span className="status-text text-active">활성화 (Active)</span>
                  </td>
                </tr>
                <tr>
                  <td className="infra-type fallback-td">Fallback Engine (백업)</td>
                  <td className="infra-url font-mono">{sysInfo.upstream.fallback_endpoint}</td>
                  <td className="infra-latency">1.25s (기본 응답)</td>
                  <td className="infra-status">
                    <span className="status-indicator standby"></span>
                    <span className="status-text text-standby">대기 중 (Standby)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
