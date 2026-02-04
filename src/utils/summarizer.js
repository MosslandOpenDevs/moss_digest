/**
 * AI-based Content Summarization Utility
 * Supports: Google Gemini API, LM Studio (OpenAI-compatible)
 */

import { createRequire } from 'module';

// CommonJS 모듈을 위한 require 생성
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// LLM Provider 설정
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'lmstudio'; // 'gemini' 또는 'lmstudio'

// =============================================================================
// LM Studio (OpenAI Compatible API)
// =============================================================================

let lmStudioClient = null;
let lmStudioModel = null;

/**
 * LM Studio 클라이언트 초기화
 */
async function initializeLMStudio() {
  const url = process.env.LMSTUDIO_URL || 'http://localhost:8899/v1';
  const model = process.env.LMSTUDIO_MODEL || 'qwen2.5-32b-instruct';

  try {
    // Dynamic import for OpenAI SDK
    const { OpenAI } = await import('openai');

    lmStudioClient = new OpenAI({
      baseURL: url,
      apiKey: 'lm-studio' // LM Studio doesn't require a real API key
    });

    lmStudioModel = model;

    console.log(`✓ LM Studio 초기화 완료`);
    console.log(`  URL: ${url}`);
    console.log(`  Model: ${model}`);
    return true;
  } catch (error) {
    console.error('✗ LM Studio 초기화 실패:', error.message);
    return false;
  }
}

/**
 * LM Studio로 텍스트 요약
 */
async function summarizeWithLMStudio(text, title = '') {
  if (!lmStudioClient) {
    throw new Error('LM Studio 클라이언트가 초기화되지 않았습니다.');
  }

  // 텍스트가 너무 길면 앞부분만 사용
  const maxLength = 8000; // LM Studio는 더 짧은 컨텍스트 사용
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

  const prompt = `다음은 "${title}"라는 제목의 문서입니다. 이 문서의 내용을 3-5줄로 요약해주세요. 핵심 내용만 간결하게 정리해주세요.

문서 내용:
${truncatedText}

요약:`;

  try {
    const completion = await lmStudioClient.chat.completions.create({
      model: lmStudioModel,
      messages: [
        { role: 'system', content: '당신은 문서 요약 전문가입니다. 주어진 문서의 핵심 내용을 3-5줄로 간결하게 요약합니다.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const summary = completion.choices[0].message.content.trim();
    return summary;
  } catch (error) {
    console.error(`  ✗ LM Studio 요약 실패:`, error.message);
    throw error;
  }
}

// =============================================================================
// Google Gemini API (주석처리됨)
// =============================================================================

// import { GoogleGenerativeAI } from '@google/generative-ai';
//
// let genAI = null;
// let model = null;
// let currentModelName = null;
//
// // 모델 우선순위 (높은 버전부터 시도)
// const MODEL_PRIORITY = [
//   'gemini-2.5-pro',    // 최고 품질 (무료: 분당 2회)
//   'gemini-2.5-flash',  // 빠르고 효율적 (무료: 분당 5회, 일당 20회)
//   'gemini-1.5-flash'   // 백업 (무료: 분당 15회)
// ];
//
// /**
//  * Gemini API 초기화 (모델 fallback 지원)
//  */
// function initializeGemini(apiKey) {
//   if (!apiKey) {
//     console.log('⚠️  GEMINI_API_KEY가 설정되지 않았습니다. AI 요약 기능이 비활성화됩니다.');
//     return false;
//   }
//
//   try {
//     genAI = new GoogleGenerativeAI(apiKey);
//
//     // 첫 번째 사용 가능한 모델로 초기화
//     currentModelName = MODEL_PRIORITY[0];
//     model = genAI.getGenerativeModel({ model: currentModelName });
//
//     console.log(`✓ Gemini API 초기화 완료 (${currentModelName})`);
//     console.log(`  Fallback 모델: ${MODEL_PRIORITY.slice(1).join(', ')}`);
//     return true;
//   } catch (error) {
//     console.error('✗ Gemini API 초기화 실패:', error.message);
//     return false;
//   }
// }
//
// /**
//  * Gemini API로 텍스트 요약 (모델 fallback 지원)
//  */
// async function summarizeWithGemini(text, title = '') {
//   if (!model || !genAI) {
//     throw new Error('Gemini API가 초기화되지 않았습니다.');
//   }
//
//   // 텍스트가 너무 길면 앞부분만 사용
//   const maxLength = 25000;
//   const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
//
//   const prompt = `다음은 "${title}"라는 제목의 공시 문서입니다. 이 문서의 내용을 3-5줄로 요약해주세요. 핵심 내용만 간결하게 정리해주세요.
//
// 문서 내용:
// ${truncatedText}
//
// 요약:`;
//
//   // 모델 우선순위에 따라 시도
//   let lastError = null;
//
//   for (const modelName of MODEL_PRIORITY) {
//     try {
//       // 현재 모델이 아니면 교체
//       if (currentModelName !== modelName) {
//         console.log(`  ⚠️  ${currentModelName} 실패, ${modelName}로 전환 시도...`);
//         model = genAI.getGenerativeModel({ model: modelName });
//         currentModelName = modelName;
//       }
//
//       const result = await model.generateContent(prompt);
//       const response = await result.response;
//       const summary = response.text();
//       return summary.trim();
//
//     } catch (error) {
//       lastError = error;
//       console.error(`  ✗ ${modelName} 실패:`, error.message);
//
//       // 404 에러면 다음 모델 시도
//       if (error.message && error.message.includes('404')) {
//         continue;
//       }
//
//       // Rate limit 에러면 다음 모델 시도
//       if (error.message && (error.message.includes('429') || error.message.includes('quota'))) {
//         continue;
//       }
//
//       // 기타 에러는 재시도하지 않음
//       throw error;
//     }
//   }
//
//   // 모든 모델 실패
//   throw new Error(`모든 Gemini 모델 실패: ${lastError?.message || 'Unknown error'}`);
// }

// =============================================================================
// 공통 API
// =============================================================================

let isInitialized = false;

/**
 * LLM 초기화 (환경변수 기반)
 */
export async function initializeLLM() {
  if (LLM_PROVIDER === 'lmstudio') {
    isInitialized = await initializeLMStudio();
  } else if (LLM_PROVIDER === 'gemini') {
    // const apiKey = process.env.GEMINI_API_KEY;
    // isInitialized = initializeGemini(apiKey);
    console.log('⚠️  Gemini API는 현재 주석처리되어 있습니다. LLM_PROVIDER=lmstudio를 사용하세요.');
    isInitialized = false;
  } else {
    console.error(`✗ 알 수 없는 LLM_PROVIDER: ${LLM_PROVIDER}`);
    isInitialized = false;
  }

  return isInitialized;
}

/**
 * Gemini API 초기화 (호환성 유지)
 * @deprecated Use initializeLLM() instead
 */
export async function initializeGemini(apiKey) {
  console.log('⚠️  initializeGemini()는 deprecated되었습니다. initializeLLM()을 사용하세요.');
  return await initializeLLM();
}

/**
 * LLM 사용 가능 여부 확인
 */
export function isGeminiAvailable() {
  return isInitialized;
}

/**
 * 텍스트 요약 (LLM Provider에 따라 자동 선택)
 */
async function summarizeText(text, title = '') {
  if (LLM_PROVIDER === 'lmstudio') {
    return await summarizeWithLMStudio(text, title);
  } else if (LLM_PROVIDER === 'gemini') {
    // return await summarizeWithGemini(text, title);
    throw new Error('Gemini API는 현재 주석처리되어 있습니다.');
  } else {
    throw new Error(`알 수 없는 LLM_PROVIDER: ${LLM_PROVIDER}`);
  }
}

// =============================================================================
// PDF 및 HTML 텍스트 추출
// =============================================================================

/**
 * PDF 파일에서 텍스트 추출
 */
async function extractTextFromPDF(pdfBuffer) {
  try {
    const data = await pdf(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF 텍스트 추출 실패:', error.message);
    return null;
  }
}

/**
 * HTML에서 텍스트 추출 (간단한 태그 제거)
 */
function extractTextFromHTML(html) {
  // 스크립트와 스타일 태그 제거
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // HTML 태그 제거
  text = text.replace(/<[^>]+>/g, ' ');

  // HTML 엔티티 디코딩
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');

  // 여러 공백을 하나로
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * 콘텐츠에서 텍스트 추출
 */
async function extractText(content, contentType) {
  if (contentType && contentType.includes('pdf')) {
    return await extractTextFromPDF(content);
  } else if (contentType && contentType.includes('html')) {
    const html = typeof content === 'string' ? content : content.toString('utf-8');
    return extractTextFromHTML(html);
  } else {
    // 기본적으로 텍스트로 처리
    return typeof content === 'string' ? content : content.toString('utf-8');
  }
}

// =============================================================================
// URL에서 콘텐츠 가져와 요약
// =============================================================================

/**
 * URL에서 콘텐츠를 가져와 요약
 */
export async function fetchAndSummarize(url, title) {
  if (!isInitialized) {
    return null;
  }

  try {
    // URL에서 콘텐츠 가져오기 (실제 브라우저처럼 보이도록 헤더 추가)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.log(`✗ ${title}: HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    const content = await response.arrayBuffer();
    const buffer = Buffer.from(content);

    // 텍스트 추출
    const text = await extractText(buffer, contentType);

    if (!text || text.length < 100) {
      console.log(`✗ ${title}: 추출된 텍스트가 너무 짧음 (${text?.length || 0}자)`);
      return null;
    }

    // LLM으로 요약
    const summary = await summarizeText(text, title);
    console.log(`✓ ${title}: 요약 완료 (원본 ${text.length}자 → ${summary.length}자)`);

    return summary;

  } catch (error) {
    console.error(`✗ ${title} 요약 실패:`, error.message);
    return null;
  }
}

/**
 * 여러 문서를 배치로 요약 (rate limiting 고려)
 */
export async function summarizeBatch(documents, delayMs = 1000) {
  if (!isInitialized) {
    console.log('⚠️  LLM을 사용할 수 없습니다. 요약을 건너뜁니다.');
    return documents.map(doc => ({ ...doc, summary: null }));
  }

  const results = [];

  console.log(`\n📝 ${documents.length}개 문서 요약 시작...`);

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`\n[${i + 1}/${documents.length}] ${doc.title}`);

    const summary = await fetchAndSummarize(doc.url, doc.title);
    results.push({
      ...doc,
      summary
    });

    // Rate limiting: 요청 사이에 지연
    if (i < documents.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const successCount = results.filter(r => r.summary).length;
  console.log(`\n✓ 요약 완료: ${successCount}/${documents.length}개 성공`);

  return results;
}
