import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateCourse, roadmap } from './course-lib.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--write')) throw new Error('只接受 --write');
  const catalog = JSON.parse(await readFile(new URL('../course/catalog.json', import.meta.url),'utf8'));
  const expected = roadmap(catalog);
  const path = new URL('../course/roadmap.md', import.meta.url);
  if (args.includes('--write')) await writeFile(path, expected);
  const report = await validateCourse(root);
  if (await readFile(path,'utf8') !== expected) report.errors.push('roadmap 与 catalog 不一致，请运行 --write');
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  console.log(`课程检查通过：${report.units} 单元（${report.ready} ready）、${report.markdown} Markdown、${report.images} 张已登记图片。只是材料检查，不是学习成绩。`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
