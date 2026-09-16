import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = (await readdir(new URL('../tests/', import.meta.url))).filter(f => (f.endsWith('.test.ts') || f.endsWith('.test.mjs'))).sort();
if (!files.length) throw new Error('没有测试，不能把空运行视为通过');
const result = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...files.map(f => `tests/${f}`)], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
