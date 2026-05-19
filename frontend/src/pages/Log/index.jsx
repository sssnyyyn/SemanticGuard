import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LogDetailModal from '../../components/common/LogDetailModal';
import './Log.css';

// 날짜 포맷 함수 (YYYY-MM-DD)
const getFormattedDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const Log = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');

  // 기본 검색 기간을 최근 7일로 설정
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(getFormattedDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(getFormattedDate(today));

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/logs?query=${encodeURIComponent(searchTerm)}`;
      if (statusFilter !== '전체') {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      if (startDate) {
        url += `&start_date=${encodeURIComponent(startDate)}`;
      }
      if (endDate) {
        url += `&end_date=${encodeURIComponent(endDate)}`;
      }
      const data = await api.get(url);
      setLogs(data);
    } catch (error) {
      console.error('로그 상세 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="log-container">
      {/* 검색 필터 카드 */}
      <form onSubmit={handleSearchSubmit} className="card-box filter-card">
        <h2 className="section-title filter-title" style={{ gridColumn: '1 / -1', marginBottom: '8px' }}>상세 로그 조회</h2>
        <div className="filter-group">
          <label className="filter-label">검색어 입력</label>
          <input
            type="text"
            placeholder="질문 내용 검색"
            className="filter-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">기간 설정</label>
          <div className="date-picker-group">
            <input
              type="date"
              className="filter-input date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="date-separator">~</span>
            <input
              type="date"
              className="filter-input date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">상태 필터</label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="전체">전체</option>
            <option value="캐시히트">캐시히트 (Cache Hit)</option>
            <option value="API호출">API호출 (Cache Miss)</option>
          </select>
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? '조회 중..' : '검색'}
        </button>
      </form>

      {/* 로그 데이터 테이블 */}
      <div className="card-box log-table-card">
        <div className="log-table-container">
          <table className="log-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>질문 내용</th>
                <th>상태</th>
                <th>응답 시간</th>
                <th>유사도</th>
                <th>절감액</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                    상세 로그를 로드하고 있습니다.
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                    일치하는 로그 내역이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} onClick={() => setSelectedLog(log)} className="clickable-row">
                    <td className="log-time">{log.timestamp}</td>
                    <td className="log-question">{log.query}</td>
                    <td>
                      <span className={`status-badge ${log.is_cache_hit ? 'success' : 'failed'}`} style={{ fontWeight: 700 }}>
                        {log.is_cache_hit ? '⚡ 캐시히트' : '🌐 API호출'}
                      </span>
                    </td>
                    <td>{log.response_time.toFixed(3)}s</td>
                    <td>{(log.similarity * 100).toFixed(1)}%</td>
                    <td className="log-savings">${log.cost_saved.toFixed(4)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 로그 모달 팝업 (A안) */}
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default Log;
