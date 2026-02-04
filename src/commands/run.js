/**
 * Run command handler
 * 전체 파이프라인 실행 (수집 + 생성)
 */

import { collectData } from './collect.js';
import { generateReports } from './generate.js';

/**
 * 전체 파이프라인 실행
 * @param {Object} options - CLI 옵션
 */
export async function runPipeline(options) {
  try {
    const { type, year, month, quarter, verbose } = options;

    console.log('\n🚀 MossDigest Full Pipeline\n');
    console.log('═'.repeat(50));

    // Step 1: Data Collection
    console.log('\n📥 STEP 1: Data Collection');
    console.log('─'.repeat(50));

    const collectOptions = {
      year,
      month: type === 'monthly' ? month : undefined,
      quarter: type === 'quarterly' ? quarter : undefined,
      verbose
    };

    await collectData(collectOptions);

    // Step 2: Report Generation
    console.log('\n📄 STEP 2: Report Generation');
    console.log('─'.repeat(50));

    const generateOptions = {
      type,
      year,
      month,
      quarter
    };

    await generateReports(generateOptions);

    // Success
    console.log('\n✅ Pipeline completed successfully!');
    console.log('═'.repeat(50));
    console.log('');

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
