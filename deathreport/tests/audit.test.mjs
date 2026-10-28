// 三份档案的整体审计：结构、广播/序数/死者言行、跨届吃书、难度指标。
// 这是 tools/audit.py 的回归测试；它比 engine/editions 的测试更偏“内容”而不是“逻辑”。
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

// Windows 上没有 python3，退回 python
const PY = (() => { for (const c of ['python3', 'python']) { try { execFileSync(c, ['-c', 'pass'], { stdio: 'ignore' }); return c; } catch { /* next */ } } throw new Error('python not found'); })();
const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('audit: three editions are consistent (structure, broadcasts, ordinals, cross-edition)', () => {
  let out = '';
  try {
    out = execFileSync(PY, ['tools/audit.py'], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    out = `${e.stdout || ''}\n${e.stderr || ''}`;
    assert.fail(`审计发现不一致：\n${out.split('\n').filter((l) => l.trim().startsWith('!')).join('\n')}`);
  }
  assert.match(out, /ERROR 0/);
});
