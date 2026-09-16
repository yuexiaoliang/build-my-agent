import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCourse, roadmap } from '../scripts/course-lib.mjs';
const source=fileURLToPath(new URL('../',import.meta.url));
async function isolated(change) {
  const root=await mkdtemp(join(tmpdir(),'course-check-'));
  try {
    await cp(source,root,{recursive:true,filter:path=>!['node_modules','.git','.runs','.lesson-preview','.private'].includes(basename(path))});
    await change(root);
  } finally { await rm(root,{recursive:true,force:true}); }
}
test('课程的当前材料、索引与真实图片一致',async()=>{
  const result=await validateCourse(source);
  assert.deepEqual(result.errors,[]); assert.equal(result.ready,4); assert.equal(result.images,2);
  assert.equal(await readFile(resolve(source,'course/roadmap.md'),'utf8'),roadmap(result.catalog));
});
test('失效当前链接必须被检查器发现',async()=>isolated(async root=>{
  await writeFile(join(root,'course/bad.md'),'[材料](missing-file.md)');
  assert.ok((await validateCourse(root)).errors.some(error=>error.includes('失效链接')));
}));
test('依赖环不能通过',async()=>isolated(async root=>{
  const path=join(root,'course/catalog.json'),catalog=JSON.parse(await readFile(path,'utf8'));
  catalog.units[0].requires=[catalog.units[1].id]; await writeFile(path,JSON.stringify(catalog));
  assert.ok((await validateCourse(root)).errors.some(error=>error.includes('有环')));
}));
test('图源改变但旧图片未更新不能通过',async()=>isolated(async root=>{
  const path=join(root,'course/assets/flow.svg');await writeFile(path,(await readFile(path,'utf8'))+'\n');
  assert.ok((await validateCourse(root)).errors.some(error=>error.includes('清单未更新')));
}));
test('没有观察和支持程度的学习评分不能通过',async()=>isolated(async root=>{
  const path=join(root,'.learning/state.json'),state=JSON.parse(await readFile(path,'utf8'));
  state.evidence=[{unit:'S1.1',score:100}];await writeFile(path,JSON.stringify(state));
  assert.ok((await validateCourse(root)).errors.some(error=>error.includes('学习证据')));
}));
