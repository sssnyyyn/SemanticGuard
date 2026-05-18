import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import QueryTester from './QueryTester';
import StatCards from './StatCards';
import DashboardCharts from './DashboardCharts';
import HistoryTable from './HistoryTable';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // 대시보드 모든 통계 및 시각화 데이터 비동기 일괄 조회
  const fetchDashboardData = async () => {
    try {
      const [statsData, chartsData, logsData] = await Promise.all([
        api.get('/api/stats'),
        api.get('/api/charts'),
        api.get('/api/logs')
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setHistory(logsData);
    } catch (error) {
      console.error('대시보드 데이터 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 테스터에서 신규 쿼리 전송 성공 시 실시간 갱신 처리
  const handleQuerySuccess = () => {
    fetchDashboardData();
  };

  return (
    <div className="dashboard-container">
      <QueryTester onQuerySuccess={handleQuerySuccess} />
      <StatCards data={stats} />
      <DashboardCharts chartsData={charts} />
      <HistoryTable data={history} />
    </div>
  );
};

export default Dashboard;
