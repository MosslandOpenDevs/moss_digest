/**
 * Generate command handler
 * 보고서 생성 명령어
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAllReports } from '../generators/pdf.js';
import { getMonthString, getQuarterString } from '../utils/date-filter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 보고서 생성 실행
 * @param {Object} options - CLI 옵션
 */
export async function generateReports(options) {
  try {
    const { type, month, quarter } = options;

    // 연도 미지정 시 현재 연도로 기본 설정 (경로에 undefined가 들어가는 것 방지)
    const year = Number.isInteger(options.year) ? options.year : new Date().getFullYear();
    if (!Number.isInteger(options.year)) {
      console.log(`ℹ️  --year가 지정되지 않아 현재 연도(${year})를 사용합니다.`);
    }

    console.log('\n📄 MossDigest Report Generation\n');
    console.log(`📊 Type: ${type}`);
    console.log(`📅 Year: ${year}`);

    // 데이터 파일 경로 결정
    let dataPath, outputDir, reportTitle, period;

    if (type === 'monthly') {
      if (!month) {
        console.error('❌ Error: --month is required for monthly reports');
        process.exit(1);
      }
      const monthStr = getMonthString(month);
      dataPath = path.join(__dirname, `../../data/${year}/monthly/${year}-${monthStr}.json`);
      outputDir = path.join(__dirname, `../../reports/${year}/monthly/${monthStr}`);
      reportTitle = `${year}년 ${month}월 보고서`;
      period = `${year}년 ${month}월`;
    } else if (type === 'quarterly') {
      if (!quarter) {
        console.error('❌ Error: --quarter is required for quarterly reports');
        process.exit(1);
      }
      const quarterStr = getQuarterString(quarter);
      dataPath = path.join(__dirname, `../../data/${year}/quarterly/${year}-${quarterStr}.json`);
      outputDir = path.join(__dirname, `../../reports/${year}/quarterly/${quarterStr}`);
      reportTitle = `${year}년 ${quarter}분기 보고서`;
      period = `${year}년 ${quarter}분기`;
    } else if (type === 'annual') {
      dataPath = path.join(__dirname, `../../data/${year}/annual/${year}.json`);
      outputDir = path.join(__dirname, `../../reports/${year}/annual`);
      reportTitle = `${year}년 연간 보고서`;
      period = `${year}년`;
    } else {
      console.error('❌ Error: Invalid report type. Use "monthly", "quarterly", or "annual"');
      process.exit(1);
    }

    // 데이터 파일 읽기
    console.log(`📂 Reading data from: ${dataPath}`);
    let data;
    try {
      const dataContent = await fs.readFile(dataPath, 'utf-8');
      data = JSON.parse(dataContent);
    } catch (error) {
      console.error(`❌ Error: Could not read data file: ${dataPath}`);
      console.error(`   Run 'mossdigest collect' first to collect data`);
      process.exit(1);
    }

    // 보고서 생성
    console.log('\n🔨 Generating reports...');
    const reportOptions = {
      reportTitle,
      period,
      year,
      month,
      quarter
    };

    const results = await generateAllReports(data, outputDir, reportOptions);

    console.log('\n✅ Report generation completed!');
    console.log(`\n📁 Generated files:`);
    console.log(`   📄 Summary (HTML): ${results.summaryHtml}`);
    // console.log(`   📕 Detail (PDF): ${results.detailPdf}`);  // PDF 생성 비활성화
    console.log('');

  } catch (error) {
    console.error('\n❌ Error during report generation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}
