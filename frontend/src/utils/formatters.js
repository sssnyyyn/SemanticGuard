/**
 * 날짜 포맷 함수
 * @param {string|Date} dateString 
 * @returns {string} YYYY-MM-DD 포맷
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 통화 포맷 함수
 * @param {number} amount 
 * @returns {string} $0,000 포맷
 */
export const formatCurrency = (amount) => {
  if (amount == null) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
