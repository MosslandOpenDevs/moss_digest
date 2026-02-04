/**
 * Date Filter Utility
 * 월간/분기/연간 기간 필터링 유틸리티
 */

/**
 * 월간 필터: 특정 연도와 월에 해당하는 날짜 범위 반환
 * @param {number} year - 연도
 * @param {number} month - 월 (1-12)
 * @returns {{startDate: Date, endDate: Date}}
 */
export function getMonthlyRange(year, month) {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * 분기 필터: 특정 연도와 분기에 해당하는 날짜 범위 반환
 * @param {number} year - 연도
 * @param {number} quarter - 분기 (1-4)
 * @returns {{startDate: Date, endDate: Date}}
 */
export function getQuarterlyRange(year, quarter) {
  if (quarter < 1 || quarter > 4) {
    throw new Error('Quarter must be between 1 and 4');
  }

  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;

  const startDate = new Date(year, startMonth - 1, 1);
  const endDate = new Date(year, endMonth, 0, 23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * 연간 필터: 특정 연도에 해당하는 날짜 범위 반환
 * @param {number} year - 연도
 * @returns {{startDate: Date, endDate: Date}}
 */
export function getAnnualRange(year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * 날짜가 특정 범위 내에 있는지 확인
 * @param {Date|string} date - 확인할 날짜
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {boolean}
 */
export function isDateInRange(date, startDate, endDate) {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate >= startDate && targetDate <= endDate;
}

/**
 * 분기 번호를 문자열로 변환
 * @param {number} quarter - 분기 (1-4)
 * @returns {string} - "Q1", "Q2", "Q3", "Q4"
 */
export function getQuarterString(quarter) {
  if (quarter < 1 || quarter > 4) {
    throw new Error('Quarter must be between 1 and 4');
  }
  return `Q${quarter}`;
}

/**
 * 월을 2자리 문자열로 변환
 * @param {number} month - 월 (1-12)
 * @returns {string} - "01" ~ "12"
 */
export function getMonthString(month) {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }
  return month.toString().padStart(2, '0');
}

/**
 * 날짜를 보고서 기간 타입에 따라 필터링하는 범위 반환
 * @param {string} type - 'monthly', 'quarterly', 'annual'
 * @param {number} year - 연도
 * @param {number} [period] - 월(1-12) 또는 분기(1-4)
 * @returns {{startDate: Date, endDate: Date}}
 */
export function getDateRange(type, year, period) {
  switch (type) {
    case 'monthly':
      if (!period) throw new Error('Month is required for monthly reports');
      return getMonthlyRange(year, period);
    case 'quarterly':
      if (!period) throw new Error('Quarter is required for quarterly reports');
      return getQuarterlyRange(year, period);
    case 'annual':
      return getAnnualRange(year);
    default:
      throw new Error('Invalid report type. Use "monthly", "quarterly", or "annual"');
  }
}
