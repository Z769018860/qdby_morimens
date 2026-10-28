// 账号系统：复用 qdby_chinese 的 Waline 服务端（真实数据库，零部署成本）
// 用户名在内部映射为 <name>@zjtt.local 的邮箱形式，对用户只暴露「用户名 + 密码」。
import { h, store, toast } from './common.js';

const SERVER = 'https://textbox.qingdengbuyi.top';
const DOMAIN = 'zjtt.local';
const KEY = { token: 'authToken', user: 'authUser' };

// 用户名归一化：全角→半角（NFKC）、去掉零宽 / 控制字符、裁掉首尾空白。
// 不做这一步会漏出「看起来重名、实际是两个账号」的口子：
//   「Ａlice」「Alice」「Alice<零宽>」「 Alice 」在界面上完全一样，
//   但邮箱分别是 ａlice@zjtt.local / alice@zjtt.local / alice<零宽>@zjtt.local …，
//   服务端的唯一约束管不到它们，于是题库署名、赠礼、排行榜会出现两个同名的人。
// 归一化之后它们都落成 alice@zjtt.local，重名才会被服务端以 USER_EXIST 拦住。
export const normalizeName = (raw) => String(raw == null ? '' : raw)
  .normalize('NFKC')
  .replace(/[\u00AD\u200B-\u200F\u2028\u2029\u2060\uFEFF]/g, '')
  .replace(/[\u0000-\u001F\u007F]/g, '')
  .trim();

// 允许的字符：任何语言的字母、数字，加下划线 / 连字符 / 间隔号。
// 不收空格和标点：空格进邮箱会被 Waline 判非法，标点则是各种仿冒重名的主要来源。
const NAME_RE = /^[\p{L}\p{N}_\-·]+$/u;

const enc = (name) => {
  const s = normalizeName(name);
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
  if (json && json.errno) {
    // Waline 的错误码不区分场景（errno 1000 既可能是「没这个号」也可能是「密码错」），
    // 能用的只有 errmsg：同名注册固定回 USER_EXIST。把原始码挂到 error 上，别靠猜文案。
    const err = new Error(json.errmsg || `errno ${json.errno}`);
    err.errno = Number(json.errno);
    err.code = String(json.errmsg || '');
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json.data;
}

// 服务端判重的唯一可靠信号
const isNameTaken = (e) => Boolean(e) && (
  e.code === 'USER_EXIST' || /USER_EXIST/i.test(String(e.message || ''))
);


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
    const s = normalizeName(name);
    if (s.length < 2) return 'tooShort';
    if (s.length > 20) return 'tooLong';
    if (!NAME_RE.test(s)) return 'badChar';
    return '';
  },

  async register(name, pass) {
    // 一律用归一化后的名字注册与判重，免得「Ａlice」「 alice<零宽> 」各占一个号
    const clean = normalizeName(name);
    const bad = this.checkName(clean);
    if (bad) throw new Error(bad);
    if (String(pass || '').length < 6) throw new Error('shortPass');
    const mail = enc(clean);
    try {
      await api('/api/user', { method: 'POST', auth: false, body: { email: mail, password: pass, name: clean, url: '' } });
    } catch (e) {
      // 同名（归一化后落在同一个邮箱）由服务端唯一约束挡住，这里翻译成「已被占用」。
      // 注意：这一步失败时服务端没有写入任何东西，所以不会出现「两个人共用一份存档」。
      if (isNameTaken(e)) throw new Error('nameTaken');
      throw e;
    }
    const user = await api('/api/token', { method: 'POST', auth: false, body: { email: mail, password: pass } });
    const out = persist(user);
    document.dispatchEvent(new CustomEvent('zjtt:login', { detail: out }));
    if (!out.name || out.name === nameOfMail(mail)) {
      try {
        const patched = await api('/api/user', { method: 'PUT', body: { display_name: clean } });
        if (patched && patched.display_name) persist({ ...user, display_name: patched.display_name });
      } catch { /* 昵称补写失败不影响登录 */ }
    }
    return this.user;
  },

  async login(name, pass) {
    let user;
    try {
      user = await api('/api/token', { method: 'POST', auth: false, body: { email: enc(name), password: pass } });
    } catch (e) {
      // 没这个号和密码不对在服务端是同一个错误码，只能给一句合并提示
      if (e && e.errno === 1000 && !e.code) throw new Error('badAuth');
      throw e;
    }
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
    if (patch.name != null) {
      // 昵称也走同一套归一化与字符规则：它会作为作者名快照写进工坊题目里，
      // 混进零宽字符或全角仿冒字，别人看到的作者名就跟你一模一样了。
      // 例外：名字没改动就放行——早年注册的名字可能不满足新规则，
      // 不能因为改个头像就卡住老用户。
      const n = normalizeName(patch.name);
      const cur = normalizeName(this.user && this.user.name);
      if (n !== cur) {
        const bad = this.checkName(n);
        if (bad) throw new Error(bad);
      }
      body.display_name = n.slice(0, 20);
    }
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
  const rule = h('p', { class: 'note hide' }, '用户名唯一（不区分大小写，全角会自动转半角），2–20 个字，只能用中文、字母、数字和 _ - ·');
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
      rule,
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
    rule.classList.toggle('hide', m !== 'register');
    btn.textContent = m === 'login' ? '登录' : '注册并登录';
    passEl.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    tip.textContent = '';
  };
  tabLogin.onclick = () => setMode('login');
  tabReg.onclick = () => setMode('register');

  btn.onclick = async () => {
    // 一律按归一化后的名字提交（全角自动转半角、不可见字符去掉），
    // 并把结果显示回输入框，让用户看清自己到底注册了哪个名字
    const name = normalizeName(userEl.value);
    const pass = passEl.value;
    if (name !== userEl.value) userEl.value = name;
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
        badChar: '用户名只能用中文、字母、数字和 _ - ·（不要空格和标点）',
        shortPass: '密码至少 6 位',
        needLogin: '请先登录',
        badAuth: '用户名或密码不对；没注册过就先切到「注册」',
        nameTaken: `用户名「${name}」已经有人用了，换一个，或者切到「登录」`,
      };
      const msg = String(e.message || '');
      tip.textContent = map[msg] || (/USER_EXIST|already|exist|重复/i.test(msg)
        ? `用户名「${name}」已经有人用了，换一个，或者切到「登录」`
        : `失败：${msg}`);
      // 重名时不留在注册 tab（用户会一直试点）：直接切到登录并把名字填好
      if (msg === 'nameTaken' || /USER_EXIST/i.test(msg)) {
        setTimeout(() => { setMode('login'); userEl.value = name; passEl.focus(); }, 900);
      }
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
