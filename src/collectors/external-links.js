/**
 * External Links Collector
 * README.md에서 날짜별 외부 링크 파싱 및 수집
 */

import { isDateInRange } from '../utils/date-filter.js';
import { summarizeBatch, isGeminiAvailable } from '../utils/summarizer.js';

/**
 * README 내용에서 날짜 + 링크 패턴 파싱
 * 지원 형식:
 * - 영문: "January 9, 2023 [Title](link)"
 * - 한글: "2025년 1월 9일 [제목](링크)"
 *
 * @param {string} readmeContent - README.md 내용
 * @returns {Array} - 파싱된 링크 배열
 */
export function parseLinksFromReadme(readmeContent) {
  if (!readmeContent) {
    return [];
  }

  const links = [];

  // 영문 날짜 패턴: "January 9, 2023 [Title](link)"
  const englishPattern = /([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*[-:]?\s*\[([^\]]+)\]\(([^)]+)\)/g;

  // 한글 날짜 패턴: "2025년 1월 9일 [제목](링크)"
  const koreanPattern = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*[-:]?\s*\[([^\]]+)\]\(([^)]+)\)/g;

  // 영문 날짜 파싱
  let match;
  while ((match = englishPattern.exec(readmeContent)) !== null) {
    const [, monthName, day, year, title, url] = match;
    const date = parseEnglishDate(monthName, day, year);

    if (date) {
      links.push({
        date,
        title: title.trim(),
        url: url.trim(),
        format: 'english'
      });
    }
  }

  // 한글 날짜 파싱
  while ((match = koreanPattern.exec(readmeContent)) !== null) {
    const [, year, month, day, title, url] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (!isNaN(date.getTime())) {
      links.push({
        date,
        title: title.trim(),
        url: url.trim(),
        format: 'korean'
      });
    }
  }

  // 날짜순 정렬 (최신순)
  links.sort((a, b) => b.date - a.date);

  return links;
}

/**
 * 영문 월 이름을 숫자로 변환
 * @param {string} monthName - 월 이름 (예: "January")
 * @returns {number|null} - 월 숫자 (0-11) 또는 null
 */
function getMonthNumber(monthName) {
  const months = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  return months[monthName.toLowerCase()] ?? null;
}

/**
 * 영문 날짜 문자열을 Date 객체로 변환
 * @param {string} monthName - 월 이름
 * @param {string} day - 일
 * @param {string} year - 년
 * @returns {Date|null}
 */
function parseEnglishDate(monthName, day, year) {
  const month = getMonthNumber(monthName);
  if (month === null) {
    return null;
  }

  const date = new Date(parseInt(year), month, parseInt(day));
  return isNaN(date.getTime()) ? null : date;
}

/**
 * 날짜 범위로 링크 필터링
 * @param {Array} links - 파싱된 링크 배열
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Array} - 필터링된 링크 배열
 */
export function filterLinksByDateRange(links, startDate, endDate) {
  return links.filter(link => isDateInRange(link.date, startDate, endDate));
}

/**
 * 외부 링크 콘텐츠 가져오기 (fetch)
 * @param {string} url - 링크 URL
 * @returns {Promise<Object>} - 링크 메타데이터
 */
export async function fetchLinkContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // HTML 페이지인 경우 타이틀 추출 시도
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;

      return {
        url,
        contentType,
        title,
        statusCode: response.status,
        finalUrl: response.url,
        success: true
      };
    }

    // 기타 콘텐츠 타입
    return {
      url,
      contentType,
      title: null,
      statusCode: response.status,
      finalUrl: response.url,
      success: true
    };

  } catch (error) {
    return {
      url,
      success: false,
      error: error.message
    };
  }
}

/**
 * README에서 링크 수집 및 콘텐츠 가져오기
 * @param {string} readmeContent - README.md 내용
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @param {boolean} fetchContent - 링크 콘텐츠를 가져올지 여부
 * @param {boolean} summarize - AI 요약 생성 여부 (Gemini API 필요)
 * @returns {Promise<Array>} - 수집된 링크 데이터
 */
export async function collectExternalLinks(readmeContent, startDate, endDate, fetchContent = true, summarize = true) {
  console.log('Parsing external links from README...');

  // 1. README에서 링크 파싱
  const allLinks = parseLinksFromReadme(readmeContent);
  console.log(`Found ${allLinks.length} total links in README`);

  // 2. 날짜 범위로 필터링
  const filteredLinks = filterLinksByDateRange(allLinks, startDate, endDate);
  console.log(`Found ${filteredLinks.length} links in date range`);

  // 3. 링크 콘텐츠 가져오기 (선택적)
  if (fetchContent) {
    const results = [];

    for (const link of filteredLinks) {
      console.log(`Fetching: ${link.url}`);
      const content = await fetchLinkContent(link.url);

      results.push({
        ...link,
        metadata: content
      });

      // Rate limiting 방지
      await sleep(500);
    }

    // 4. AI 요약 생성 (선택적)
    if (summarize && isGeminiAvailable() && results.length > 0) {
      console.log('\n🤖 AI 요약 생성 시작...');
      const documentsToSummarize = results.map(link => ({
        url: link.url,
        title: link.title
      }));

      const summaries = await summarizeBatch(documentsToSummarize, 2000);

      // 요약을 결과에 추가
      for (let i = 0; i < results.length; i++) {
        results[i].summary = summaries[i].summary;
      }
    }

    return results;
  }

  return filteredLinks;
}

/**
 * 수집된 링크 통계 생성
 * @param {Array} links - 수집된 링크 배열
 * @returns {Object} - 통계 정보
 */
export function generateLinkStatistics(links) {
  const stats = {
    total: links.length,
    byFormat: {
      english: 0,
      korean: 0
    },
    byMonth: {},
    successfulFetches: 0,
    failedFetches: 0
  };

  for (const link of links) {
    // 형식별 집계
    stats.byFormat[link.format]++;

    // 월별 집계
    const monthKey = `${link.date.getFullYear()}-${String(link.date.getMonth() + 1).padStart(2, '0')}`;
    stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;

    // Fetch 성공/실패 집계
    if (link.metadata) {
      if (link.metadata.success) {
        stats.successfulFetches++;
      } else {
        stats.failedFetches++;
      }
    }
  }

  return stats;
}

/**
 * 지연 함수 (rate limiting 방지)
 * @param {number} ms - 밀리초
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
