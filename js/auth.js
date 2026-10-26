// 账号系统：复用 qdby_chinese 的 Waline 服务端（真实数据库，零部署成本）
// 用户名在内部映射为 <name>@zjtt.local 的邮箱形式，对用户只暴露「用户名 + 密码」。
import { h, store, toast } from './common.js';

const SERVER = 'https://textbox.qingdengbuyi.top';
const DOMAIN = 'zjtt.local';
const KEY = { token: 'authToken', user: 'authUser' };

const enc = (name) => {
  const s = String(name || '').trim();
  return s.includes('@') ? s : `${s.toLowerCase()}@${DOMAIN}`;
};
export const nameOfMail = (mail) => String(mail || '').replace(new RegExp(`@${DOMAIN}$`, 'i'), '');

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  const token = store.get(KEY.token, '');
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(SERVER + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { /* 非 JSON 响应 */ }
  if (json && json.errno) throw new Error(json.errmsg || `errno ${json.errno}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json.data;
}

// 给 js/account.js 复用：同一套 token 与错误处理
export const wApi = api;
export const WALINE = { server: SERVER, domain: DOMAIN };

function persist(user) {
  if (!user) {
    store.set(KEY.token, '');
    store.set(KEY.user, null);
    return null;
  }
  const clean = {
    id: user.objectId, token: user.token, mail: user.email,
    name: user.display_name || nameOfMail(user.email),
    avatar: user.avatar || '', url: user.url || '',
    created: user.createdAt || '',
  };
  store.set(KEY.token, clean.token || '');
  store.set(KEY.user, clean);
  return clean;
}

export const auth = {
  get user() { return store.get(KEY.user, null); },
  get token() { return store.get(KEY.token, ''); },
  get logged() { return !!store.get(KEY.token, ''); },

  checkName(name) {
    const s = String(name || '').trim();
    if (s.length < 2) return 'tooShort';
    if (s.length > 20) return 'tooLong';
    if (/[\s@]/.test(s)) return 'badChar';
    return '';
  },

  async register(name, pass) {
    const bad = this.checkName(name);
    if (bad) throw new Error(bad);
    if (String(pass || '').length < 6) throw new Error('shortPass');
    const mail = enc(name);
    await api('/api/user', { method: 'POST', auth: false, body: { email: mail, password: pass, name, url: '' } });
    const user = await api('/api/token', { method: 'POST', auth: false, body: { email: mail, password: pass } });
    const clean = persist(user);
    document.dispatchEvent(new CustomEvent('zjtt:login', { detail: clean }));
    if (!clean.name || clean.name === nameOfMail(mail)) {
      try {
        const patched = await api('/api/user', { method: 'PUT', body: { display_name: String(name).trim() } });
        if (patched && patched.display_name) persist({ ...user, display_name: patched.display_name });
      } catch { /* 昵称补写失败不影响登录 */ }
    }
    return this.user;
  },

  async login(name, pass) {
    const user = await api('/api/token', { method: 'POST', auth: false, body: { email: enc(name), password: pass } });
    const clean = persist(user);
    document.dispatchEvent(new CustomEvent('zjtt:login', { detail: clean }));
    return clean;
  },

  logout() { persist(null); },

  // 刷新头像 / 昵称（改完之后拿一次最新资料）
  async refresh() {
    if (!this.logged) return null;
    try {
      const data = await api(`/api/token`, { method: 'POST', auth: false, body: {} });
      return persist(data);
    } catch {
      return this.user;
    }
  },

  async update(patch) {
    if (!this.logged) throw new Error('needLogin');
    const body = {};
    if (patch.name != null) body.display_name = String(patch.name).trim().slice(0, 20);
    if (patch.avatar != null) body.avatar = String(patch.avatar).slice(0, 250);
    if (patch.url != null) body.url = String(patch.url).slice(0, 250);
    await api('/api/user', { method: 'PUT', body });
    const cur = this.user || {};
    return persist({ ...cur, objectId: cur.id, display_name: body.display_name ?? cur.name, avatar: body.avatar ?? cur.avatar, url: body.url ?? cur.url, email: cur.mail, token: this.token, createdAt: cur.created });
  },

  avatarOf(user) {
    const u = user || this.user;
    return (u && u.avatar) || DEFAULT_AVATAR;
  },
};

// ------------------------------------------------------------------ 头像库
// 用 Waline 的 Q 版头像集（qdby_chinese/assets/waline-avatars），构建成 data/avatars-q.json。
// 旧的 assets/avatars/*（立绘裁切）保留，老账号存的路径还能正常显示。
export const DEFAULT_AVATAR = 'assets/avatars-q/char-albino.webp';
let AVQ = null;
export async function avatarLib() {
  if (AVQ) return AVQ;
  try {
    const r = await fetch('data/avatars-q.json', { cache: 'no-cache' });
    const d = await r.json();
    AVQ = { size: d.size || 96, groups: d.groups || [], items: d.items || [] };
  } catch {
    AVQ = { size: 96, groups: [], items: [] };
  }
  return AVQ;
}

// ------------------------------------------------------------------ 登录弹窗
export function openLogin(onDone) {
  if (auth.logged) { if (onDone) onDone(auth.user); return; }
  let mode = 'login';
  const userEl = h('input', { type: 'text', placeholder: '用户名', autocomplete: 'username', maxlength: 20 });
  const passEl = h('input', { type: 'password', placeholder: '密码（至少 6 位）', autocomplete: 'current-password' });
  const pass2El = h('input', { type: 'password', placeholder: '确认密码', autocomplete: 'new-password' });
  const tip = h('p', { class: 'note' }, '');
  const btn = h('button', { type: 'button', class: 'btn' }, '登录');
  const tabLogin = h('button', { type: 'button', class: 'link on' }, '登录');
  const tabReg = h('button', { type: 'button', class: 'link' }, '注册');
  const dlg = h('dialog', { class: 'authdlg' },
    h('div', { class: 'authbox' },
      h('div', { class: 'authtabs' }, tabLogin, tabReg),
      h('h3', {}, '战报侦探 · 账号'),
      h('label', { class: 'fld' }, userEl),
      h('label', { class: 'fld' }, passEl),
      h('label', { class: 'fld hide', id: 'auth-p2' }, pass2El),
      tip,
      h('div', { class: 'actions' },
        btn,
        h('button', { type: 'button', class: 'btn ghost', onclick: () => dlg.close() }, '取消'))));

  const setMode = (m) => {
    mode = m;
    tabLogin.classList.toggle('on', m === 'login');
    tabReg.classList.toggle('on', m === 'register');
    h; // keep tree stable
    dlg.querySelector('#auth-p2').classList.toggle('hide', m !== 'register');
    btn.textContent = m === 'login' ? '登录' : '注册并登录';
    passEl.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    tip.textContent = '';
  };
  tabLogin.onclick = () => setMode('login');
  tabReg.onclick = () => setMode('register');

  btn.onclick = async () => {
    const name = userEl.value.trim();
    const pass = passEl.value;
    if (mode === 'register' && pass !== pass2El.value) { tip.textContent = '两次密码不一致'; return; }
    btn.disabled = true;
    tip.textContent = '处理中…';
    try {
      if (mode === 'login') await auth.login(name, pass);
      else await auth.register(name, pass);
      dlg.close();
      dlg.remove();
      toast(`欢迎，${auth.user?.name || name}`);
      if (onDone) onDone(auth.user);
      else location.reload();
    } catch (e) {
      const map = {
        tooShort: '用户名至少 2 个字符', tooLong: '用户名最多 20 个字符',
        badChar: '用户名不能包含空格或 @', shortPass: '密码至少 6 位',
        needLogin: '请先登录',
      };
      const msg = String(e.message || '');
      tip.textContent = map[msg] || (/already|exist|重复/i.test(msg) ? '这个用户名已被注册' : `失败：${msg}`);
    } finally {
      btn.disabled = false;
    }
  };
  passEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });

  document.body.append(dlg);
  dlg.showModal();
  setTimeout(() => userEl.focus(), 50);
}

// 导航栏用的小头像按钮
export function avatarChip(size = 26) {
  const u = auth.user;
  return h('a', { class: 'avatar-chip', href: 'profile.html', title: u ? u.name : '登录 / 注册' },
    h('img', { src: auth.avatarOf(u), alt: '', width: size, height: size, loading: 'lazy' }),
    h('span', {}, u ? u.name : '登录'));
}
