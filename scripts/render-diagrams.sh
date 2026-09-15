#!/usr/bin/env bash
# 从讲义 Markdown 中提取 ```mermaid 代码块，渲染为 PNG 供本地查看。
# 用法：scripts/render-diagrams.sh <讲义.md> [输出目录，默认 .lesson-preview/]
# 渲染用系统 Chrome（PUPPETEER_EXECUTABLE_PATH 可覆盖），GitHub 页面上 Mermaid 块本身即可渲染。
set -euo pipefail

input="${1:?用法：scripts/render-diagrams.sh <讲义.md> [输出目录]}"
outdir="${2:-.lesson-preview}"

if [[ ! -f "$input" ]]; then
  echo "找不到文件：$input" >&2
  exit 2
fi

export PUPPETEER_EXECUTABLE_PATH="${PUPPETEER_EXECUTABLE_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [[ ! -x "$PUPPETEER_EXECUTABLE_PATH" ]]; then
  echo "找不到可用的 Chrome：$PUPPETEER_EXECUTABLE_PATH" >&2
  echo "请安装 Chrome，或用 PUPPETEER_EXECUTABLE_PATH 指定一个 Chromium 内核浏览器。" >&2
  exit 1
fi

mkdir -p "$outdir"
awk -v outdir="$outdir" '
  /^```mermaid[[:space:]]*$/ { flag = 1; n++; file = sprintf("%s/diagram-%02d.mmd", outdir, n); next }
  /^```[[:space:]]*$/ && flag { flag = 0; next }
  flag { print > file }
  END { if (n == 0) exit 3 }
' "$input" || {
  code=$?
  if [[ $code -eq 3 ]]; then
    echo "$input 里没有 mermaid 代码块。" >&2
    exit 0
  fi
  exit "$code"
}

for src in "$outdir"/diagram-*.mmd; do
  png="${src%.mmd}.png"
  echo "渲染 $src -> $png"
  npx mmdc -i "$src" -o "$png" -w 1200 -b white --quiet
done
echo "完成。输出目录：$outdir（本地预览用，不入库）"
