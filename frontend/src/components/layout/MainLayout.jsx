import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const location = useLocation();
  
  const getPageTitle = () => {
    if (location.pathname.includes('/dashboard')) return 'Home';
    if (location.pathname.includes('/log')) return 'Log';
    if (location.pathname.includes('/settings')) return 'System Setting';
    return 'Home';
  };

  return (
    <div className="layout-root">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <div className="main-content-wrapper">
          <main className="content-area">
            <h1 className="content-page-title">{getPageTitle()}</h1>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
