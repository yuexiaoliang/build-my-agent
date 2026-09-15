#!/usr/bin/env bash
# fixtures 维护校验（离线、免费；不经过模型）
# 用法：npm run check:fixtures
# 规则（约定详见 fixtures/INDEX.md）：
#   1. 每个 fixtures/**/*.json 通过 readChatFixture 结构校验
#   2. docs/lessons、scripts、fixtures/INDEX.md 中引用的 fixture 路径必须存在
#      （src/cli.ts 用法说明里的 fixtures/xxx 是占位符，不纳入）
#   3. fixtures/ch*/ 下的每个文件必须被 docs/lessons 或 scripts 以完整路径引用；
#      fixtures/_pending/ 豁免（待认领录制，见 INDEX.md）
#   4. 课程文档禁止省略号引用（如 `…-round2.json`），必须写完整路径
cd "$(dirname "$0")/.." || exit 1

fail=0
err() { printf 'FAIL  %s\n' "$1"; fail=$((fail + 1)); }

# 1. 结构校验
while IFS= read -r -d '' f; do
  out=$(node --input-type=module -e '
import { readChatFixture } from "./src/fixture.ts";
try { await readChatFixture(process.argv[1]); }
catch (error) { console.error(error.message); process.exit(1); }
' "$f" 2>&1) || err "结构不合法：$f（$out）"
done < <(find fixtures -name '*.json' -print0 | sort -z)

# 2. 引用存在（含 INDEX.md 自身）
refs=$(grep -rhoE 'fixtures/[A-Za-z0-9_/.-]+\.json' docs/lessons scripts fixtures/INDEX.md | sort -u)
for ref in $refs; do
  [ -f "$ref" ] || err "引用指向不存在的文件：$ref"
done

# 3. 章节 fixture 不得是孤儿（_pending 豁免）
course_refs=$(grep -rhoE 'fixtures/[A-Za-z0-9_/.-]+\.json' docs/lessons scripts | sort -u)
while IFS= read -r -d '' f; do
  grep -qxF "$f" <<<"$course_refs" || err "未被课程或脚本引用（孤儿）：$f——请登记引用或移入 fixtures/_pending/"
done < <(find fixtures -mindepth 2 -name '*.json' -not -path 'fixtures/_pending/*' -print0 | sort -z)

# 4. 禁止省略号引用
ellipsis=$(grep -rlE '…[^`)]*\.json' docs/lessons || true)
[ -n "$ellipsis" ] && err "课程文档存在省略号 fixture 引用：$(tr '\n' ' ' <<<"$ellipsis")"

if [ "$fail" -eq 0 ]; then
  total=$(find fixtures -name '*.json' | wc -l | tr -d ' ')
  pending=$(find fixtures/_pending -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
  printf 'PASS  fixtures 校验通过（共 %s 个，其中 _pending %s 个）\n' "$total" "$pending"
else
  printf '\n%d 项失败\n' "$fail"
  exit 1
fi
