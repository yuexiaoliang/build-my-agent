import { readFile, access, readdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function roadmap(catalog) {
  let output = '# 课程路线\n\n本页由 course/catalog.json 生成，使用 `node scripts/check-course.mjs --write` 更新；不在本页手工维护当前进度。ready 表示可开始教学，不表示学习者已掌握；planned 是后续单元规格。\n\n';
  for (const stage of catalog.stages) {
    output += `## ${stage.id} · ${stage.title}\n\n阶段出口：${stage.exit}\n\n`;
    for (const unit of catalog.units.filter(unit => unit.stage === stage.id)) {
      output += `### ${unit.id} ${unit.title} · ${unit.status}\n\n目的：${unit.purpose}\n\n活动：${unit.activity}\n\n验收：${unit.acceptance}\n\n[当前材料](${relative('course', unit.material).replaceAll('\\', '/')})。直接前置：${unit.requires.join('、') || '无；利用已有前端经验'}。\n\n`;
    }
  }
  return output + '研究、深入多 Agent、行业咨询和企业培训为后续选修，不作为当前主线身份与毕业门槛。个人品牌从真实作品中选择性沉淀，不设置日更或收入目标。\n';
}
export async function validateCourse(root) {
  const errors = [];
  const catalog = JSON.parse(await readFile(resolve(root, 'course/catalog.json'), 'utf8'));
  const state = JSON.parse(await readFile(resolve(root, '.learning/state.json'), 'utf8'));
  if (catalog.version !== 1 || !Array.isArray(catalog.units) || !Array.isArray(catalog.stages)) throw new Error('课程索引结构无效');
  const ids = new Set(catalog.units.map(unit => unit.id));
  if (ids.size !== catalog.units.length) errors.push('单元 id 重复');
  const stageIds = new Set(catalog.stages.map(stage => stage.id));
  const safe = path => typeof path === 'string' && !path.includes('\\') && !path.startsWith('/') && !path.split('/').includes('..');
  for (const unit of catalog.units) {
    if (!stageIds.has(unit.stage) || !['ready', 'planned'].includes(unit.status)) errors.push(`状态或阶段无效：${unit.id}`);
    for (const key of ['title', 'purpose', 'activity', 'acceptance']) if (typeof unit[key] !== 'string' || !unit[key].trim()) errors.push(`缺少 ${key}：${unit.id}`);
    if (!Array.isArray(unit.requires)) { errors.push(`前置不是数组：${unit.id}`); continue; }
    for (const dep of unit.requires) if (!ids.has(dep)) errors.push(`前置不存在：${unit.id} -> ${dep}`);
    if (!safe(unit.material)) errors.push(`材料路径无效：${unit.id}`);
    else try { await access(resolve(root, unit.material)); } catch { errors.push(`材料不存在：${unit.material}`); }
    if (unit.status === 'ready' && !unit.material.startsWith('course/units/')) errors.push(`ready 必须有独立单元材料：${unit.id}`);
  }
  const visiting = new Set(), done = new Set();
  const visit = id => {
    if (done.has(id)) return;
    if (visiting.has(id)) { errors.push(`依赖有环：${id}`); return; }
    visiting.add(id);
    for (const dep of catalog.units.find(unit => unit.id === id)?.requires ?? []) if (ids.has(dep)) visit(dep);
    visiting.delete(id); done.add(id);
  };
  for (const id of ids) visit(id);
  if (state.version !== 1 || !ids.has(state.currentUnit) || !Array.isArray(state.completedUnits) || !Array.isArray(state.evidence)) throw new Error('学习状态结构无效');
  for (const id of state.completedUnits) if (!ids.has(id)) errors.push(`未知已完成单元：${id}`);
  if (new Set(state.completedUnits).size !== state.completedUnits.length) errors.push('完成记录重复');
  for (const e of state.evidence) {
    if (!ids.has(e.unit) || !['demonstrated','prompted','independent'].includes(e.support) || !['concept','date','observation','source'].every(key => typeof e[key] === 'string' && e[key].trim())) errors.push('学习证据缺少来源、范围或支持程度');
  }
  const manifest = JSON.parse(await readFile(resolve(root, 'course/assets/manifest.json'), 'utf8'));
  for (const image of manifest.images) {
    for (const key of ['source', 'image']) if (!safe(image[key])) throw new Error('图片路径不安全');
    try {
      const source = await readFile(resolve(root, image.source)); const picture = await readFile(resolve(root, image.image));
      if (sha256(source) !== image.sourceHash || sha256(picture) !== image.imageHash) errors.push(`图源/图片已变更而清单未更新：${image.id}`);
      if (!picture.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) errors.push(`不是 PNG：${image.id}`);
    } catch { errors.push(`图片或图源缺失：${image.id}`); }
  }
  async function walk(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (['node_modules','.git','.runs','.lesson-preview','.private'].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) files.push(...await walk(path)); else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
    }
    return files;
  }
  const files = await walk(root);
  for (const path of files) {
    const text = await readFile(path,'utf8');
    // 对实际 Markdown 链接做路径核对；不猜测反引号中的历史文件名。
    for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1];
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const target = decodeURIComponent(href.split('#')[0]);
      if (!target) continue;
      const absolute = resolve(dirname(path), target);
      if (relative(root, absolute).startsWith('..')) { errors.push(`越界链接：${href}`); continue; }
      try { await access(absolute); } catch { errors.push(`失效链接 ${relative(root,path)} -> ${href}`); }
    }
  }
  return { errors, units: catalog.units.length, ready: catalog.units.filter(unit => unit.status === 'ready').length, markdown: files.length, images: manifest.images.length, catalog };
}
