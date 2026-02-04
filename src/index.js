#!/usr/bin/env node

/**
 * MossDigest CLI
 * 명령줄 인터페이스
 */

import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../config/.env');
dotenv.config({ path: envPath });

const program = new Command();

// Package info
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, '../package.json'), 'utf-8')
);

program
  .name('mossdigest')
  .description('Automated pipeline for collecting Mossland project activities')
  .version(packageJson.version);

// ==================== Sources Commands ====================

const sourcesCmd = program
  .command('sources')
  .description('Manage data sources');

sourcesCmd
  .command('list')
  .description('List configured data sources')
  .action(async () => {
    const { listSources } = await import('./commands/sources.js');
    await listSources();
  });

sourcesCmd
  .command('validate')
  .description('Validate sources.json configuration')
  .action(async () => {
    const { validateSources } = await import('./commands/sources.js');
    await validateSources();
  });

// ==================== Collect Commands ====================

program
  .command('collect')
  .description('Collect data from configured sources')
  .option('-y, --year <year>', 'Year', parseInt)
  .option('-m, --month <month>', 'Month (1-12)', parseInt)
  .option('-q, --quarter <quarter>', 'Quarter (1-4)', parseInt)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    const { collectData } = await import('./commands/collect.js');
    await collectData(options);
  });

// ==================== Generate Commands ====================

program
  .command('generate')
  .description('Generate reports from collected data')
  .requiredOption('-t, --type <type>', 'Report type (monthly, quarterly, annual)')
  .option('-y, --year <year>', 'Year', parseInt)
  .option('-m, --month <month>', 'Month (1-12)', parseInt)
  .option('-q, --quarter <quarter>', 'Quarter (1-4)', parseInt)
  .action(async (options) => {
    const { generateReports } = await import('./commands/generate.js');
    await generateReports(options);
  });

// ==================== Run Command (Full Pipeline) ====================

program
  .command('run')
  .description('Run full pipeline: collect + generate')
  .requiredOption('-t, --type <type>', 'Report type (monthly, quarterly, annual)')
  .option('-y, --year <year>', 'Year', parseInt)
  .option('-m, --month <month>', 'Month (1-12)', parseInt)
  .option('-q, --quarter <quarter>', 'Quarter (1-4)', parseInt)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    const { runPipeline } = await import('./commands/run.js');
    await runPipeline(options);
  });

// ==================== Build Web Command ====================

program
  .command('build-web')
  .description('Build entry point web page')
  .action(async () => {
    const { buildWebPage } = await import('./commands/build-web.js');
    await buildWebPage();
  });

// ==================== Scheduler Commands ====================

const schedulerCmd = program
  .command('scheduler')
  .description('Manage automated scheduler');

schedulerCmd
  .command('start')
  .description('Start automated report generation scheduler')
  .action(async () => {
    const { startScheduler } = await import('./commands/scheduler.js');
    await startScheduler();
  });

schedulerCmd
  .command('stop')
  .description('Stop scheduler')
  .action(() => {
    console.log('Scheduler stopped');
    process.exit(0);
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
