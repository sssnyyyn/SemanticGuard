import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="top-header">
      <div className="header-left">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <span className="logo-text">SemanticGuard</span>
        </div>
      </div>
      <div className="header-actions">
        <button className="icon-btn">🔔</button>
        <button className="icon-btn">⚙️</button>
        <div className="user-avatar-top">h</div>
      </div>
    </header>
  );
};

export default Header;
