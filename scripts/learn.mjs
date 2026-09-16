import { readFile } from 'node:fs/promises';
const state = JSON.parse(await readFile(new URL('../.learning/state.json', import.meta.url),'utf8'));
const catalog = JSON.parse(await readFile(new URL('../course/catalog.json', import.meta.url),'utf8'));
const unit = catalog.units.find(unit => unit.id === state.currentUnit);
if (!unit) throw new Error('当前单元不在课程索引中');
console.log(`${unit.id} · ${unit.title}\n用途：${unit.purpose}\n材料：${unit.material}\n备课状态：${unit.status}\n下一动作：${state.nextAction}\n\n向授课 AI 说：读取 AGENTS.md，从这里继续。此命令不修改学习记录。`);
