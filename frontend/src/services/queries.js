import api from './api';

export const queryService = {
  // 쿼리 제출
  submitQuery: (data) => api.post('/api/query', data),
  
  // 통계 데이터 가져오기
  getStats: () => api.get('/api/stats'),
};
