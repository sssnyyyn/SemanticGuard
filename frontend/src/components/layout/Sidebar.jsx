import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-action">
        <button className="new-chat-btn">
          <span className="plus-icon">+</span> New Chatting
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <span className="nav-icon">📊</span>
              Home
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/log" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <span className="nav-icon">📑</span>
              Log
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/settings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <span className="nav-icon">⚙️</span>
              System Setting
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="inquiry-btn">문의하기</button>
        <div className="user-profile-card">
          <div className="user-avatar-sm">h</div>
          <div className="user-info">
            <span className="user-name">human401</span>
            <span className="user-plan">Pro Plan</span>
          </div>
          <div className="dropdown-icon">▼</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
