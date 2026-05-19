import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);

  // 문의하기 양식
  const [inquiryEmail, setInquiryEmail] = useState('human401@example.com');
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryTitle.trim() || !inquiryContent.trim()) {
      alert('제목과 내용을 모두 입력해 주십시오.');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await api.post('/api/inquiry', {
        email: inquiryEmail,
        title: inquiryTitle,
        content: inquiryContent
      });
      alert(`📬 ${resp.message || '문의사항이 성공적으로 전달되었습니다.'}`);
      setShowInquiry(false);
      setInquiryTitle('');
      setInquiryContent('');
    } catch (err) {
      console.error(err);
      alert('문의 전송에 실패했습니다. 네트워크 상태를 확인하십시오.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top-banner"></div>

      <nav className="sidebar-nav" style={{ marginTop: '8px' }}>
        <ul className="nav-list">
          <li className="nav-item">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <span className="nav-icon">📊</span>
              <span>Home</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/log" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <span className="nav-icon">📑</span>
              <span>Log</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              <span className="nav-icon">⚙️</span>
              <span>System Setting</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="inquiry-btn" onClick={() => setShowInquiry(true)}>문의하기</button>

        <div className="sidebar-user-menu" ref={profileRef}>
          <div className="user-profile-card" onClick={() => setShowProfile(!showProfile)}>
            <div className="user-avatar-sm">h</div>
            <div className="user-info">
              <span className="user-name">human401</span>
              <span className="dropdown-user-plan">Pro Plan</span>
            </div>
            <div className="dropdown-icon">▼</div>
          </div>

          {showProfile && (
            <div className="sidebar-profile-dropdown">
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

      {/* 문의하기 팝업 모달 */}
      {showInquiry && (
        <div className="inquiry-modal-overlay" onClick={() => setShowInquiry(false)}>
          <div className="inquiry-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inquiry-modal-header">
              <h3>📬 1:1 문의사항 접수</h3>
              <button className="inquiry-close-btn" onClick={() => setShowInquiry(false)}>&times;</button>
            </div>
            <form onSubmit={handleInquirySubmit} className="inquiry-form">
              <div className="inquiry-form-group">
                <label className="inquiry-label">회신 받으실 이메일</label>
                <input
                  type="email"
                  className="inquiry-input"
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  required
                />
              </div>
              <div className="inquiry-form-group">
                <label className="inquiry-label">문의 제목</label>
                <input
                  type="text"
                  className="inquiry-input"
                  placeholder="문의 제목을 입력하세요."
                  value={inquiryTitle}
                  onChange={(e) => setInquiryTitle(e.target.value)}
                  required
                />
              </div>
              <div className="inquiry-form-group">
                <label className="inquiry-label">문의 내용</label>
                <textarea
                  className="inquiry-textarea"
                  placeholder="문의하실 상세 내용을 기입하시면 시스템 관리자(회장님)에게 발송됩니다."
                  value={inquiryContent}
                  onChange={(e) => setInquiryContent(e.target.value)}
                  required
                />
              </div>
              <div className="inquiry-modal-footer">
                <button type="button" className="inquiry-cancel-btn" onClick={() => setShowInquiry(false)}>취소</button>
                <button type="submit" className="inquiry-submit-btn" disabled={submitting}>
                  {submitting ? '전송 중...' : '문의하기 요청'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
