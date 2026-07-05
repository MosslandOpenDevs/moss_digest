/**
 * Sources command handlers
 * 데이터 소스 관리 명령어
 */

import fs from 'fs/promises';
import path from 'path';
import Ajv from 'ajv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCES_PATH = path.join(__dirname, '../../config/sources.json');

/**
 * 설정된 데이터 소스 목록 출력
 */
export async function listSources() {
  try {
    const sourcesData = await fs.readFile(SOURCES_PATH, 'utf-8');
    const sources = JSON.parse(sourcesData);

    console.log('\n📋 Configured Data Sources\n');

    // Medium Feeds
    console.log('📝 Medium RSS Feeds:');
    if (sources.medium?.feeds) {
      sources.medium.feeds.forEach(feed => {
        const status = feed.enabled ? '✅' : '❌';
        console.log(`  ${status} ${feed.name}`);
        console.log(`     ${feed.url}`);
      });
    }

    // GitHub Repositories
    console.log('\n💾 GitHub Repositories:');
    if (sources.github?.repositories) {
      sources.github.repositories.forEach(repo => {
        const status = repo.enabled ? '✅' : '❌';
        console.log(`  ${status} ${repo.owner}/${repo.repo}`);
        console.log(`     ${repo.description}`);
        console.log(`     Track files: ${repo.trackFiles.join(', ')}`);
      });
    }

    // GitHub Organizations
    console.log('\n🏢 GitHub Organizations:');
    if (sources.github?.organizations) {
      sources.github.organizations.forEach(org => {
        const status = org.enabled ? '✅' : '❌';
        console.log(`  ${status} ${org.name} (${org.type})`);
        console.log(`     ${org.description}`);
        const features = [];
        if (org.trackNewRepos) features.push('new repos');
        if (org.trackCommits) features.push('commits');
        if (org.trackReleases) features.push('releases');
        console.log(`     Tracking: ${features.join(', ')}`);
      });
    }

    console.log('\n');

  } catch (error) {
    console.error('Error reading sources.json:', error.message);
    process.exit(1);
  }
}

/**
 * sources.json 파일 검증
 */
export async function validateSources() {
  try {
    // sources.json 읽기
    const sourcesData = await fs.readFile(SOURCES_PATH, 'utf-8');
    const sources = JSON.parse(sourcesData);

    // JSON Schema 정의
    const schema = {
      type: 'object',
      required: ['medium', 'github', 'reporting'],
      properties: {
        medium: {
          type: 'object',
          required: ['feeds'],
          properties: {
            feeds: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'url', 'enabled'],
                properties: {
                  name: { type: 'string' },
                  // format: 'uri'는 Ajv v8 기본 빌드에 포함되지 않아(ajv-formats 필요)
                  // strict 모드에서 컴파일 에러를 유발하므로 패턴으로 검증한다.
                  url: { type: 'string', pattern: '^https?://' },
                  enabled: { type: 'boolean' }
                }
              }
            }
          }
        },
        github: {
          type: 'object',
          required: ['repositories', 'organizations'],
          properties: {
            repositories: {
              type: 'array',
              items: {
                type: 'object',
                required: ['owner', 'repo', 'enabled'],
                properties: {
                  owner: { type: 'string' },
                  repo: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                  trackFiles: { type: 'array', items: { type: 'string' } },
                  parseReadmeLinks: { type: 'boolean' },
                  enabled: { type: 'boolean' }
                }
              }
            },
            organizations: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'enabled'],
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                  trackNewRepos: { type: 'boolean' },
                  trackCommits: { type: 'boolean' },
                  trackReleases: { type: 'boolean' },
                  enabled: { type: 'boolean' }
                }
              }
            }
          }
        },
        reporting: {
          type: 'object',
          properties: {
            schedule: { type: 'object' },
            outputs: { type: 'object' }
          }
        }
      }
    };

    // 검증
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(sources);

    if (valid) {
      console.log('✅ sources.json is valid!');
      console.log(`\n📊 Summary:`);
      console.log(`   Medium feeds: ${sources.medium?.feeds?.length || 0}`);
      console.log(`   GitHub repositories: ${sources.github?.repositories?.length || 0}`);
      console.log(`   GitHub organizations: ${sources.github?.organizations?.length || 0}`);
    } else {
      console.error('❌ sources.json validation failed:');
      console.error(validate.errors);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error validating sources.json:', error.message);
    process.exit(1);
  }
}
