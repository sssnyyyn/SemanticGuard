/**
 * 퍼센트 계산 함수
 * @param {number} value 
 * @param {number} total 
 * @returns {number} 퍼센트 값 (소수점 2자리)
 */
export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
};
