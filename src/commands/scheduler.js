/**
 * Scheduler command handler
 * 자동 스케줄러
 */

import cron from 'node-cron';
import { runPipeline } from './run.js';

/**
 * 스케줄러 시작
 */
export async function startScheduler() {
  console.log('\n⏰ MossDigest Scheduler Started\n');
  console.log('📅 Schedule:');
  console.log('   - Monthly: 1st of every month at 00:00');
  console.log('   - Quarterly: 1st of Jan/Apr/Jul/Oct at 00:00');
  console.log('   - Annual: January 1st at 00:00');
  console.log('\nPress Ctrl+C to stop\n');

  // 월간 보고서: 매월 1일 00:00
  cron.schedule('0 0 1 * *', async () => {
    console.log('\n🔔 Running monthly report...');
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    try {
      await runPipeline({
        type: 'monthly',
        year: lastMonth.getFullYear(),
        month: lastMonth.getMonth() + 1,
        verbose: false
      });
      console.log('✅ Monthly report completed');
    } catch (error) {
      console.error('❌ Monthly report failed:', error.message);
    }
  });

  // 분기 보고서: 1, 4, 7, 10월 1일 00:00
  cron.schedule('0 0 1 1,4,7,10 *', async () => {
    console.log('\n🔔 Running quarterly report...');
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const quarter = Math.floor((currentMonth - 1) / 3);
    const lastQuarter = quarter === 0 ? 4 : quarter;
    const year = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();

    try {
      await runPipeline({
        type: 'quarterly',
        year: year,
        quarter: lastQuarter,
        verbose: false
      });
      console.log('✅ Quarterly report completed');
    } catch (error) {
      console.error('❌ Quarterly report failed:', error.message);
    }
  });

  // 연간 보고서: 1월 1일 00:00
  cron.schedule('0 0 1 1 *', async () => {
    console.log('\n🔔 Running annual report...');
    const now = new Date();
    const lastYear = now.getFullYear() - 1;

    try {
      await runPipeline({
        type: 'annual',
        year: lastYear,
        verbose: false
      });
      console.log('✅ Annual report completed');
    } catch (error) {
      console.error('❌ Annual report failed:', error.message);
    }
  });

  // Keep the process alive
  process.stdin.resume();
}
