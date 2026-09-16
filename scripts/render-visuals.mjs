import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const result = spawnSync(python, [fileURLToPath(new URL('./render-visuals.py', import.meta.url)), ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) { console.error(`无法启动 Python：${result.error.message}。已有课程 PNG 仍可直接使用。`); process.exitCode = 1; }
else process.exitCode = result.status ?? 1;
