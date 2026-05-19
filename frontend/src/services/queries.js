import api from './api';

export const queryService = {
  submitQuery: (data) => api.post('/api/query', data),
  getStats: () => api.get('/api/stats'),
};
