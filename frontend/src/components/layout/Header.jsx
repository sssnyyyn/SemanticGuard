import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleBellClick = () => {
    alert('🔔 알림 기능은 현재 준비 중입니다.');
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="logo-container">
          <img src="/docs/images/logo.png" alt="SemanticGuard Logo" className="logo-icon" />
          <span className="logo-text">SemanticGuard</span>
        </div>
      </div>
      <div className="header-actions">
        <button className="icon-btn" onClick={handleBellClick}>🔔</button>
        <button className="icon-btn" onClick={handleSettingsClick}>⚙️</button>
        <div className="header-user-menu" ref={profileRef}>
          <div
            className="user-avatar-top"
            onClick={() => setShowProfile(!showProfile)}
          >
            h
          </div>
          {showProfile && (
            <div className="header-profile-dropdown">
              <div className="dropdown-user-info">
                <div className="user-avatar-lg">h</div>
                <div className="dropdown-user-details">
                  <span className="dropdown-user-name">human401</span>
                  <span className="dropdown-user-plan">Pro Plan</span>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-menu-item" onClick={() => { navigate('/settings'); setShowProfile(false); }}>
                ⚙️ 계정 및 시스템 설정
              </div>
              <div className="dropdown-menu-item logout-item" onClick={() => alert('🚪 로그아웃 기능은 현재 준비 중입니다.')}>
                🚪 로그아웃
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
