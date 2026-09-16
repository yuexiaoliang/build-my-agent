const $ = id => document.getElementById(id);
let activeId = null;
let completed = null;
let running = false;
const labels = { "run.started": "运行开始", "model.requested": "发送模型请求", "model.responded": "收到模型响应", "tool.requested": "准备工具请求", "tool.executed": "工具执行成功", "tool.rejected": "工具被拒绝", "run.finished": "运行终态" };
const states = { answered: "已生成回答（不等于任务完成）", blocked: "已拦截", exhausted: "预算用尽", truncated: "响应截断", cancelled: "服务端已确认取消", timed_out: "等待超时", failed: "运行失败" };
const status = text => { $("status").textContent = text; };
function setRunning(value) {
  running = value;
  for (const id of ["run-button", "mode", "scenario", "question", "tools-enabled", "max-turns"]) $(id).disabled = value;
  if (!value && $("mode").value === "live") $("scenario").disabled = true;
  $("cancel-button").disabled = !value || !activeId;
}
function renderEvent(event) {
  const li = document.createElement("li");
  const title = document.createElement("strong");
  title.textContent = `${event.seq}. ${labels[event.kind] ?? event.kind} · 第 ${event.turn} 轮`;
  const details = document.createElement("details");
  const summary = document.createElement("summary"); summary.textContent = "查看这一步的数据";
  const pre = document.createElement("pre"); pre.textContent = JSON.stringify(event.detail, null, 2);
  details.append(summary, pre); li.append(title, details); $("events").append(li);
  $("events").scrollTop = $("events").scrollHeight;
}
function receive(message) {
  if (message.type === "accepted") { activeId = message.data.id; $("cancel-button").disabled = false; }
  if (message.type === "event") renderEvent(message.data);
  if (message.type === "result") {
    completed = message.data;
    status(`${states[completed.status] ?? completed.status}。${completed.reason}；实际执行 ${completed.executed} 次工具。`);
    $("answer").textContent = completed.answer || "本次没有可作为最终回答使用的内容。";
    $("verification").textContent = { matched: "样例条件匹配，仍不代表全面正确。", failed: "样例条件不满足：检查下面缺少的依据。", not_checked: "非固定任务，当前检查器不评分。" }[completed.verification.verdict];
    for (const check of completed.verification.checks) {
      const li = document.createElement("li"); li.textContent = `${check.ok ? "✓" : "×"} ${check.name}`; $("checks").append(li);
    }
    $("storage").textContent = completed.saved ? `已保存 .runs/${completed.id}/result.json（本机私有，不自动发布）` : "磁盘保存失败；可导出当前结果，但不能声称已落盘。";
    $("export-button").disabled = false;
  }
}
$("run-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (running) return;
  if ($("mode").value === "live" && !window.confirm("本次会把问题与合成资料发送给配置的模型服务，可能产生费用。确认开始？")) return;
  activeId = null; completed = null; $("events").replaceChildren(); $("checks").replaceChildren();
  $("answer").textContent = "等待结果…"; $("verification").textContent = "运行中，尚无终态。"; $("export-button").disabled = true;
  $("storage").textContent = "尚未确认保存。";
  $("mode-badge").textContent = $("mode").value === "live" ? "真实调用 · 有费用" : "合成离线";
  setRunning(true); status("运行中。你可以展开每一步的数据，或请求停止。");
  try {
    const response = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      mode: $("mode").value, scenario: $("scenario").value, question: $("question").value,
      toolsEnabled: $("tools-enabled").checked, maxTurns: Number($("max-turns").value)
    }) });
    if (!response.ok) throw new Error((await response.json()).error ?? "请求失败");
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        if (chunk.startsWith("data: ")) receive(JSON.parse(chunk.slice(6)));
      }
    }
    if (!completed) throw new Error("连接已结束，但没有收到终态；不能推断任务成功或取消完成。");
  } catch (error) { status(error.message); }
  finally { activeId = null; setRunning(false); }
});
$("cancel-button").addEventListener("click", async () => {
  if (!activeId) return;
  $("cancel-button").disabled = true; status("已请求停止，等待服务端终态确认…");
  try {
    const response = await fetch("/api/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeId }) });
    if (!response.ok && !completed) status("取消请求未被接受；等待原运行结果，不推断已经停止。");
  } catch { if (!completed) status("取消请求连接失败；服务端状态未确认。"); }
});
$("export-button").addEventListener("click", () => {
  if (!completed) return;
  const blob = new Blob([JSON.stringify(completed, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `${completed.id}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("mode").addEventListener("change", () => {
  if ($("mode").value === "live") { $("scenario").value = "normal"; $("scenario").disabled = true; }
  else $("scenario").disabled = false;
});
fetch("/api/config").then(response => response.json()).then(config => {
  if (config.liveEnabled) { $("live-option").disabled = false; $("live-option").textContent = "真实调用 · 明确确认后联网"; }
}).catch(() => status("无法读取本地配置；先检查服务是否已启动。"));
