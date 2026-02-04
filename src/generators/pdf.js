/**
 * PDF Report Generator
 * Puppeteer를 사용하여 HTML을 PDF로 변환
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { generateDetailReport } from './html.js';

/**
 * HTML을 PDF로 변환
 * @param {string} html - HTML 문자열
 * @param {string} outputPath - 출력 PDF 파일 경로
 * @param {Object} options - PDF 생성 옵션
 */
export async function convertHtmlToPdf(html, outputPath, options = {}) {
  const {
    format = 'A4',
    margin = {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    printBackground = true,
    displayHeaderFooter = false
  } = options;

  let browser;

  try {
    console.log('Launching browser for PDF generation...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // HTML 콘텐츠 설정
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    // 디렉토리 생성
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // PDF 생성
    await page.pdf({
      path: outputPath,
      format,
      margin,
      printBackground,
      displayHeaderFooter
    });

    console.log(`PDF report saved: ${outputPath}`);

  } catch (error) {
    console.error('Error generating PDF:', error.message);
    throw error;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 데이터로부터 직접 PDF 보고서 생성
 * @param {Object} data - 수집된 데이터
 * @param {string} outputPath - 출력 PDF 파일 경로
 * @param {Object} reportOptions - 보고서 옵션
 * @param {Object} pdfOptions - PDF 생성 옵션
 */
export async function generatePdfReport(data, outputPath, reportOptions = {}, pdfOptions = {}) {
  try {
    // HTML 보고서 생성
    console.log('Generating HTML report...');
    const html = await generateDetailReport(data, reportOptions);

    // PDF로 변환
    console.log('Converting HTML to PDF...');
    await convertHtmlToPdf(html, outputPath, pdfOptions);

  } catch (error) {
    console.error('Error generating PDF report:', error.message);
    throw error;
  }
}

/**
 * 기존 HTML 파일을 PDF로 변환
 * @param {string} htmlPath - HTML 파일 경로
 * @param {string} outputPath - 출력 PDF 파일 경로
 * @param {Object} options - PDF 생성 옵션
 */
export async function convertHtmlFileToPdf(htmlPath, outputPath, options = {}) {
  try {
    // HTML 파일 읽기
    const html = await fs.readFile(htmlPath, 'utf-8');

    // PDF로 변환
    await convertHtmlToPdf(html, outputPath, options);

  } catch (error) {
    console.error('Error converting HTML file to PDF:', error.message);
    throw error;
  }
}

/**
 * 요약 보고서와 상세 보고서를 모두 생성
 * @param {Object} data - 수집된 데이터
 * @param {string} outputDir - 출력 디렉토리
 * @param {Object} options - 보고서 옵션
 * @returns {Promise<Object>} - 생성된 파일 경로
 */
export async function generateAllReports(data, outputDir, options = {}) {
  const { generateSummaryReport, saveHtmlReport } = await import('./html.js');

  const results = {
    summaryHtml: null,
    detailPdf: null
  };

  try {
    // 디렉토리 생성
    await fs.mkdir(outputDir, { recursive: true });

    // 1. 요약 보고서 (HTML) 생성
    console.log('Generating summary report (HTML)...');
    const summaryHtml = await generateSummaryReport(data, options);
    const summaryPath = path.join(outputDir, 'summary.html');
    await saveHtmlReport(summaryHtml, summaryPath);
    results.summaryHtml = summaryPath;

    // 2. 상세 보고서 (PDF) 생성 - 주석처리됨 (나중에 필요시 활성화)
    // console.log('Generating detail report (PDF)...');
    // const detailPath = path.join(outputDir, 'detail.pdf');
    // await generatePdfReport(data, detailPath, options);
    // results.detailPdf = detailPath;

    console.log('All reports generated successfully!');
    return results;

  } catch (error) {
    console.error('Error generating reports:', error.message);
    throw error;
  }
}

/**
 * 여러 페이지를 하나의 PDF로 병합
 * @param {Array<string>} htmlPages - HTML 페이지 배열
 * @param {string} outputPath - 출력 PDF 파일 경로
 * @param {Object} options - PDF 생성 옵션
 */
export async function mergePagesIntoPdf(htmlPages, outputPath, options = {}) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 모든 페이지를 하나의 HTML로 결합
    const combinedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          .page-break {
            page-break-after: always;
          }
        </style>
      </head>
      <body>
        ${htmlPages.map((html, index) => `
          <div class="${index < htmlPages.length - 1 ? 'page-break' : ''}">
            ${html}
          </div>
        `).join('')}
      </body>
      </html>
    `;

    await page.setContent(combinedHtml, {
      waitUntil: 'networkidle0'
    });

    // 디렉토리 생성
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // PDF 생성
    await page.pdf({
      path: outputPath,
      format: options.format || 'A4',
      margin: options.margin || {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: options.printBackground !== false,
      displayHeaderFooter: options.displayHeaderFooter || false
    });

    console.log(`Merged PDF saved: ${outputPath}`);

  } catch (error) {
    console.error('Error merging pages into PDF:', error.message);
    throw error;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
