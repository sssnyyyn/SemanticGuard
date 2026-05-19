import React from 'react';

const HistoryTable = ({ data, onRowClick }) => {
  const historyData = data && data.length > 0 ? data.slice(0, 5) : [];

  return (
    <div className="history-table-wrapper">
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>질문 내용</th>
              <th>타임 스탬프</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {historyData.length > 0 ? (
              historyData.map((item) => (
                <tr key={item.id} onClick={() => onRowClick && onRowClick(item)} className="clickable-row">
                  <td>{item.query}</td>
                  <td>{item.timestamp}</td>
                  <td>
                    <span className={`status-badge ${item.is_cache_hit ? 'success' : 'failed'}`}>
                      {item.is_cache_hit ? '⚡ 캐시히트' : '🌐 API호출'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                  최근 이력이 존재하지 않습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;
