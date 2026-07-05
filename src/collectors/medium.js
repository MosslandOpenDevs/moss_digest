/**
 * Medium RSS Collector
 * Medium 블로그 RSS 피드 수집기
 */

import Parser from 'rss-parser';
import { isDateInRange } from '../utils/date-filter.js';
import { summarizeBatch, isLLMAvailable } from '../utils/summarizer.js';

const parser = new Parser();

/**
 * Medium RSS 피드에서 글 목록 수집
 * @param {string} feedUrl - RSS 피드 URL
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @param {boolean} summarize - AI 요약 생성 여부
 * @returns {Promise<Array>} - 필터링된 블로그 글 목록
 */
export async function collectMediumPosts(feedUrl, startDate, endDate, summarize = true) {
  try {
    console.log(`Fetching Medium RSS feed: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);

    const filteredPosts = feed.items
      .filter(item => {
        const pubDate = new Date(item.pubDate || item.isoDate);
        return isDateInRange(pubDate, startDate, endDate);
      })
      .map(item => ({
        title: item.title,
        link: item.link,
        pubDate: new Date(item.pubDate || item.isoDate),
        author: item.creator || item['dc:creator'] || 'Unknown',
        categories: item.categories || [],
        summary: extractSummary(item.contentSnippet || item.content || ''),
        guid: item.guid || item.link
      }));

    console.log(`Found ${filteredPosts.length} posts in date range`);

    // AI 요약 생성
    if (summarize && isLLMAvailable() && filteredPosts.length > 0) {
      console.log('\n🤖 Medium 블로그 AI 요약 생성 시작...');
      const documentsToSummarize = filteredPosts.map(post => ({
        url: post.link,
        title: post.title
      }));

      const summaries = await summarizeBatch(documentsToSummarize, 2000);

      // AI 요약을 결과에 추가
      for (let i = 0; i < filteredPosts.length; i++) {
        if (summaries[i].summary) {
          filteredPosts[i].aiSummary = summaries[i].summary;
        }
      }

      const successCount = summaries.filter(s => s.summary).length;
      console.log(`✓ Medium 블로그 AI 요약 완료: ${successCount}/${filteredPosts.length}개 성공`);
    }

    return filteredPosts;

  } catch (error) {
    console.error(`Error fetching Medium RSS feed: ${error.message}`);
    throw error;
  }
}

/**
 * 여러 Medium 피드에서 데이터 수집
 * @param {Array} feeds - 피드 설정 배열 [{name, url, enabled}]
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @param {boolean} summarize - AI 요약 생성 여부
 * @returns {Promise<Object>} - 피드별 글 목록
 */
export async function collectFromMultipleFeeds(feeds, startDate, endDate, summarize = true) {
  const results = {};

  for (const feed of feeds) {
    if (!feed.enabled) {
      console.log(`Skipping disabled feed: ${feed.name}`);
      continue;
    }

    try {
      const posts = await collectMediumPosts(feed.url, startDate, endDate, summarize);
      results[feed.name] = {
        feedUrl: feed.url,
        posts: posts,
        count: posts.length
      };
    } catch (error) {
      console.error(`Error collecting from ${feed.name}:`, error.message);
      results[feed.name] = {
        feedUrl: feed.url,
        posts: [],
        count: 0,
        error: error.message
      };
    }
  }

  return results;
}

/**
 * 콘텐츠에서 요약문 추출 (처음 300자)
 * @param {string} content - 전체 콘텐츠
 * @returns {string} - 요약문
 */
function extractSummary(content) {
  // HTML 태그 제거
  const text = content.replace(/<[^>]*>/g, '');

  // 특수 문자 디코딩
  const decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 300자로 제한
  const maxLength = 300;
  if (decoded.length <= maxLength) {
    return decoded.trim();
  }

  return decoded.substring(0, maxLength).trim() + '...';
}

/**
 * 수집된 데이터 통계 생성
 * @param {Object} results - collectFromMultipleFeeds의 결과
 * @returns {Object} - 통계 정보
 */
export function generateStatistics(results) {
  const stats = {
    totalPosts: 0,
    feedsProcessed: 0,
    feedsWithErrors: 0,
    byFeed: {}
  };

  for (const [feedName, data] of Object.entries(results)) {
    stats.feedsProcessed++;
    stats.totalPosts += data.count;

    if (data.error) {
      stats.feedsWithErrors++;
    }

    stats.byFeed[feedName] = {
      count: data.count,
      hasError: !!data.error,
      errorMessage: data.error || null
    };
  }

  return stats;
}
