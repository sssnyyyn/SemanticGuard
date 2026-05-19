import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

// 모의 데이터 (Mock Data)
const defaultBarData = [
  { name: 'Jan', cache: 0, api: 2400 },
  { name: 'Feb', cache: 3000, api: 1398 },
  { name: 'Mar', cache: 2000, api: 9800 },
  { name: 'Apr', cache: 2780, api: 3908 },
  { name: 'May', cache: 1890, api: 4800 },
  { name: 'Jun', cache: 2390, api: 3800 },
  { name: 'Jul', cache: 3490, api: 0 },
];

const defaultLineData = [
  { time: '09:00', latency: 45 },
  { time: '12:00', latency: 85 },
  { time: '15:00', latency: 40 },
  { time: '18:00', latency: 90 },
];

const DashboardCharts = ({ chartsData }) => {
  const barData = chartsData?.barData || defaultBarData;
  const lineData = chartsData?.lineData || defaultLineData;
  return (
    <div className="charts-grid">
      <div className="card-box chart-card">
        <h3 className="chart-title">AI 답변 출처 비율 (비용 절감 캐시 vs 유료 API 호출)</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              <Tooltip
                cursor={{fill: '#F3F4F6'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
              {/* 캐시 히트 */}
              <Bar dataKey="cache" name="캐시 히트" fill="#E5E7EB" barSize={12} radius={[4, 4, 0, 0]} />
              {/* API 호출 */}
              <Bar dataKey="api" name="API 호출" fill="#DE7B63" barSize={12} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-box chart-card">
        <h3 className="chart-title">시간대별 이용자 질문 유입 추이</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Line type="monotone" dataKey="latency" name="응답 속도 (ms)" stroke="#DE7B63" strokeWidth={3} dot={{ r: 4, fill: '#DE7B63', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
