import React from 'react';

const defaultHistoryData = [
  { id: 'h1', query: '2026년 대한민국 경제 성장률 전망은?', timestamp: '2026.05.18 14:00:31', status: '성공' },
  { id: 'h2', query: '2026년 대한민국 경제 성장률 전망은?', timestamp: '2026.05.18 14:03:45', status: '성공' },
  { id: 'h3', query: 'SemanticGuard의 핵심 기능과 장점을 설명해줘.', timestamp: '2026.05.18 14:15:22', status: '성공' }
];

const HistoryTable = ({ data }) => {
  const historyData = data && data.length > 0 ? data.slice(0, 5) : defaultHistoryData;

  return (
    <div className="card-box">
      <h3 className="section-title">최근 이력</h3>
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
            {historyData.map((item) => (
              <tr key={item.id}>
                <td>{item.query}</td>
                <td>{item.timestamp}</td>
                <td>
                  <span className={`status-badge ${item.status === '성공' ? 'success' : 'failed'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;
