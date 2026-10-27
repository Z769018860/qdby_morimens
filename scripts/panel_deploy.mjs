// 用 Pterodactyl 面板的「客户端 API」把后端部署上去，省掉手动传文件/改启动命令。
//
// 为什么要有这个：面板不提供 SSH，只有文件管理器和 SFTP。每次改完 server/ 代码，
// 重新上传 → 解压 → 改启动命令 → 重启，手点一遍很容易漏（尤其是漏解压）。
//
// 准备：面板右上头像 → Account → API Credentials → Create（勾读+写），把 key 放进环境变量
//   Windows bash:  PANEL_KEY=xxxxxxxx node scripts/panel_deploy.mjs info
//   PowerShell:    $env:PANEL_KEY="xxxxxxxx"; node scripts/panel_deploy.mjs info
//
// 用法：
//   node scripts/panel_deploy.mjs info            看服务器列表、端口、启动变量
//   node scripts/panel_deploy.mjs deploy <zip>    上传 zip → 解压 → 设启动命令 → 启动 → 探活
//   node scripts/panel_deploy.mjs logs            拉最近的控制台输出（排错用）
//   node scripts/panel_deploy.mjs power start|restart|stop
//
// 可选环境变量：
//   PANEL_URL   面板地址，默认 https://panel.waifly.com
//   SERVER_ID   服务器 identifier（默认自动选唯一那台，多于一台时必须指定）
import fs from 'node:fs';
import path from 'node:path';

const PANEL = String(process.env.PANEL_URL || 'https://panel.waifly.com').replace(/\/+$/, '');
const KEY = String(process.env.PANEL_KEY || '').trim();
const WANT_ID = String(process.env.SERVER_ID || '').trim();

// 面板的默认启动命令写的是 npm start / node index.js，这里统一换成我们的入口
const START_CMD = 'node node.js';

function die(msg, extra) {
  console.error('\n✗ ' + msg);
  if (extra) console.error(typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2));
  process.exit(1);
}

async function api(p, { method = 'GET', body, raw = false, timeout = 30e3 } = {}) {
  if (!KEY) die('没有设置 PANEL_KEY。面板右上头像 → Account → API Credentials → Create，然后把 key 给我。');
  const headers = { Accept: 'application/json', Authorization: 'Bearer ' + KEY };
  let payload = body;
  if (body && !raw) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(PANEL + p, {
    method, headers, body: payload, signal: AbortSignal.timeout(timeout),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const detail = (data && data.errors && data.errors[0] && data.errors[0].detail) || data;
    if (res.status === 401) die('API key 无效或已撤销（401）。重新在面板 Account → API Credentials 建一个。', detail);
    if (res.status === 403) die('这个 key 权限不够（403）。创建时把 read + write 都勾上。', detail);
    if (res.status === 429) die('面板限流（429），等一分钟再试。', detail);
    die(`${method} ${p} → ${res.status}`, detail);
  }
  return data;
}

async function pickServer() {
  const list = await api('/api/client');
  const servers = (list && list.data) || [];
  if (!servers.length) die('这个账号下没有服务器。');
  const items = servers.map((s) => ({ id: s.attributes.identifier, name: s.attributes.name }));
  if (WANT_ID) {
    const hit = items.find((s) => s.id === WANT_ID || s.name === WANT_ID);
    if (!hit) die(`找不到服务器 ${WANT_ID}，可选：${items.map((s) => `${s.name}(${s.id})`).join(', ')}`);
    return hit;
  }
  if (items.length > 1) {
    die(`有 ${items.length} 台服务器，用 SERVER_ID 指定一台：\n` +
      items.map((s) => `  SERVER_ID=${s.id}   # ${s.name}`).join('\n'));
  }
  return items[0];
}

async function serverInfo(id) {
  const d = await api(`/api/client/servers/${id}`);
  return d.attributes;
}

async function startupVars(id) {
  const d = await api(`/api/client/servers/${id}/startup`);
  return (d.data || []).map((v) => v.attributes);
}

async function cmdInfo() {
  const s = await pickServer();
  const a = await serverInfo(s.id);
  const allocs = ((a.relationships && a.relationships.allocations && a.relationships.allocations.data) || [])
    .map((x) => x.attributes);
  const primary = allocs.find((x) => x.is_default) || allocs[0] || {};
  const host = primary.ip_alias || primary.ip || (a.sftp_details && a.sftp_details.ip) || '?';
  const port = primary.port || '?';

  console.log(`服务器   ${a.name}  (${a.identifier})`);
  console.log(`状态     ${a.status || '?'}   节点 ${a.node || '?'}`);
  console.log(`公开地址 http://${host}:${port}`);
  if (a.sftp_details) console.log(`SFTP     ${a.sftp_details.ip}:${a.sftp_details.port}`);
  console.log(`资源     ${a.limits && a.limits.memory}MB 内存 / ${a.limits && a.limits.disk}MB 磁盘`);

  const vars = await startupVars(s.id);
  console.log('\n启动变量：');
  for (const v of vars) {
    const cur = v.server_value !== null && v.server_value !== undefined ? v.server_value : v.default_value;
    console.log(`  ${String(v.env_variable).padEnd(18)} = ${cur === '' ? '(空)' : cur}`);
    if (v.description) console.log(`  ${''.padEnd(18)}   ${String(v.description).replace(/\s+/g, ' ').slice(0, 90)}`);
  }
  console.log('\n部署：node scripts/panel_deploy.mjs deploy .tmp-syn/zjtt-server.zip');
  return { a, host, port };
}

async function cmdLs(id) {
  const d = await api(`/api/client/servers/${id}/files/list?directory=%2F`);
  const names = (d.data || []).map((f) => `${f.attributes.is_file ? ' ' : '/'}${f.attributes.name}`);
  console.log(names.join('\n') || '(空目录)');
}

async function cmdDeploy(zipPath) {
  if (!zipPath) die('用法: node scripts/panel_deploy.mjs deploy <zip 路径>');
  if (!fs.existsSync(zipPath)) die('找不到文件: ' + zipPath);
  const buf = fs.readFileSync(zipPath);
  const name = path.basename(zipPath);

  const s = await pickServer();
  const a = await serverInfo(s.id);
  console.log(`→ 目标服务器：${a.name} (${s.id})`);
  await cmdLs(s.id).catch(() => {});

  // 1) 上传
  const form = new FormData();
  form.append('files', new Blob([buf], { type: 'application/zip' }), name);
  await api(`/api/client/servers/${s.id}/files/upload?directory=%2F`, {
    method: 'POST', body: form, raw: true, timeout: 120e3,
  });
  console.log(`✓ 已上传 ${name}（${(buf.length / 1024).toFixed(1)} KB）`);

  // 2) 解压：root 指 zip 内部起点（我们的包文件都在根），解到容器的 /
  await api(`/api/client/servers/${s.id}/files/decompress?directory=%2F`, {
    method: 'POST', body: { root: '/', file: name },
  });
  console.log('✓ 已解压到容器根目录');

  const check = await api(`/api/client/servers/${s.id}/files/list?directory=%2F`);
  const have = new Set((check.data || []).map((f) => f.attributes.name));
  const need = ['node.js', 'worker.js', 'schema.sql', 'package.json'];
  const miss = need.filter((n) => !have.has(n));
  if (miss.length) die('解压后缺少文件: ' + miss.join(', ') + '\n目录里现有: ' + [...have].join(', '));
  console.log('✓ 四个文件都在位');

  // 3) 启动命令：找到 egg 里那一条，改成 node node.js
  const vars = await startupVars(s.id);
  const cmdVar = vars.find((v) => /^(STARTUP|START_CMD|CMD|START_COMMAND)$/i.test(v.env_variable))
    || vars.find((v) => /command|cmd/i.test(v.env_variable) && /start|node|npm/i.test(String(v.default_value || '')));
  if (cmdVar) {
    if (String(cmdVar.server_value || cmdVar.default_value || '').trim() !== START_CMD) {
      await api(`/api/client/servers/${s.id}/startup/variable`, {
        method: 'PUT', body: { key: cmdVar.env_variable, value: START_CMD },
      });
      console.log(`✓ 启动命令 ${cmdVar.env_variable} = ${START_CMD}`);
    } else {
      console.log(`✓ 启动命令已是 ${START_CMD}`);
    }
  } else {
    console.log('! 没认出启动命令变量，请在面板 Startup 页手动填 node node.js');
  }

  // 4) 开机
  const res = await api(`/api/client/servers/${s.id}/resources`);
  const state = res && res.attributes && res.attributes.current_state;
  const signal = state === 'running' ? 'restart' : 'start';
  await api(`/api/client/servers/${s.id}/power`, { method: 'POST', body: { signal } });
  console.log(`✓ 已发送 ${signal}（之前状态 ${state}）`);

  // 5) 探活
  const allocs = ((a.relationships && a.relationships.allocations && a.relationships.allocations.data) || [])
    .map((x) => x.attributes);
  const primary = allocs.find((x) => x.is_default) || allocs[0] || {};
  const host = primary.ip_alias || primary.ip;
  const url = `http://${host}:${primary.port}`;
  console.log(`\n等待 ${url}/health …`);
  for (let i = 1; i <= 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch(url + '/health', { signal: AbortSignal.timeout(5000) });
      const t = await r.text();
      if (r.ok) {
        console.log(`✓ 第 ${i} 次探活成功 (${i * 2}s)：${t.trim()}`);
        console.log(`\n把前端指到这里：node scripts/set_api_base.mjs ${url}`);
        return;
      }
      if (i === 1 || i % 5 === 0) console.log(`  …${i * 2}s HTTP ${r.status} ${t.slice(0, 80)}`);
    } catch (e) {
      if (i === 1 || i % 5 === 0) console.log(`  …${i * 2}s ${e.name === 'TimeoutError' ? '超时' : e.message}`);
    }
  }
  die('等了 60 秒还没起来。用 `node scripts/panel_deploy.mjs logs` 看控制台输出；\n' +
    '常见原因：Node 版本低于 22.5（没有 node:sqlite）、启动命令没改成 node node.js。');
}

async function cmdLogs(id) {
  const d = await api(`/api/client/servers/${id}/logs`);
  console.log((d.attributes || {}).logs || '(没有日志)');
}

async function cmdPower(id, signal) {
  if (!['start', 'restart', 'stop', 'kill'].includes(signal)) die('signal 只能是 start/restart/stop/kill');
  await api(`/api/client/servers/${id}/power`, { method: 'POST', body: { signal } });
  console.log('✓ 已发送 ' + signal);
}

const [cmd = 'info', arg] = process.argv.slice(2);
const s = cmd === 'info' ? null : await pickServer();
if (cmd === 'info') await cmdInfo();
else if (cmd === 'deploy') await cmdDeploy(arg);
else if (cmd === 'logs') await cmdLogs(s.id);
else if (cmd === 'ls') await cmdLs(s.id);
else if (cmd === 'power') await cmdPower(s.id, arg || 'restart');
else die('未知命令：' + cmd + '\n可用：info / deploy <zip> / logs / ls / power start|restart|stop');
