import { create } from 'zustand';

const useAppStore = create((set) => ({
  // 상태 변수
  history: [],
  stats: null,
  isLoading: false,

  // 액션
  setHistory: (history) => set({ history }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  addQueryToHistory: (query) => set((state) => ({ history: [query, ...state.history] })),
}));

export default useAppStore;
