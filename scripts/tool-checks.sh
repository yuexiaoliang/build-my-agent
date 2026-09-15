#!/usr/bin/env bash
# 工具管线用例矩阵：校验闸门的回归（离线、免费；不经过模型）
# 用法：npm run check:tools
# 已知边界（未纳入矩阵）：符号链接可以绕过词法检查，留待第 06 章。
cd "$(dirname "$0")/.." || exit 1

pass=0
fail=0

check() {
  local name="$1" expect_code="$2" pattern="$3"
  shift 3
  local output code
  output="$(node src/cli.ts call "$@" 2>&1)"
  code=$?
  if [ "$code" = "$expect_code" ] && grep -q -- "$pattern" <<<"$output"; then
    printf 'PASS  %s\n' "$name"
    pass=$((pass + 1))
  else
    printf 'FAIL  %s（期望退出码 %s 且含「%s」，实际退出码 %s）\n' "$name" "$expect_code" "$pattern" "$code"
    printf '%s\n' "$output" | sed 's/^/      /'
    fail=$((fail + 1))
  fi
}

check "合法文件" 0 "练习用笔记" read_file '{"path": "notes.txt"}'
check "点开头文件名（仍在 sandbox 内）" 0 "边界用例" read_file '{"path": "..notes.txt"}'
check "list_files" 0 "notes.txt" list_files '{}'
check "越界：相对路径" 6 "路径越界" read_file '{"path": "../package.json"}'
check "越界：绝对路径" 6 "路径越界" read_file '{"path": "/etc/hosts"}'
check "越界：内部路径混杂回退" 6 "路径越界" read_file '{"path": "notes.txt/../../package.json"}'
check "参数类型错" 6 "应为字符串" read_file '{"path": 123}'
check "缺少必填参数" 6 "缺少必填" read_file '{}'
check "参数不是合法 JSON" 6 "不是合法 JSON" read_file 'not-json'
check "参数不是对象" 6 "必须是 JSON 对象" read_file '[1]'
check "未知工具" 6 "未知工具" delete_all '{}'

printf '\n%d 通过，%d 失败\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
