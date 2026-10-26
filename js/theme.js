// CG 背景主题：解锁某张 CG 后，可把它设成全站背景，并按这张图的主色重排 UI 配色。
// 配色在构建期已经算好（scripts/build_themes.py → data/themes.json），运行时只做变量注入。
import { store, unlocked, toast, t, markDirty } from './common.js';

let THEMES = null;
let GALLERY = null;
const CACHE_KEY = 'theme';

async function loadJson(path) {
  const r = await fetch(path, { cache: 'force-cache' });
  if (!r.ok) throw new Error(path);
  return r.json();
}

export async function themeLib() {
  if (!THEMES) THEMES = await loadJson('data/themes.json');
  return THEMES;
}

export async function galleryLib() {
  if (!GALLERY) {
    const g = await loadJson('data/gallery.json');
    GALLERY = { list: g.items || [], by: new Map((g.items || []).map((i) => [i.id, i])) };
  }
  return GALLERY;
}

export const activeTheme = () => store.get(CACHE_KEY, null);

// 把主题写进 :root 的行内样式（行内优先级最高，能盖掉 prefers-color-scheme 的媒体查询）
export function paint(th) {
  const root = document.documentElement;
  if (!th || !th.vars) {
    root.removeAttribute('data-themed');
    ['--bg', '--panel', '--panel2', '--line', '--text', '--dim', '--accent', '--gold', '--theme-img']
      .forEach((k) => root.style.removeProperty(k));
    document.body.classList.remove('themed');
    return;
  }
  for (const [k, v] of Object.entries(th.vars)) root.style.setProperty(`--${k}`, v);
  if (th.img) root.style.setProperty('--theme-img', `url("${new URL(th.img, document.baseURI).href}")`);
  root.setAttribute('data-themed', th.dark ? 'dark' : 'light');
  document.body.classList.add('themed');
}

export function applyStored() {
  const th = activeTheme();
  if (th && th.vars) paint(th);
}

export async function setTheme(id) {
  if (!id) return null;
  if (!unlocked.has(id)) throw new Error('locked');
  const [themes, gal] = await Promise.all([themeLib(), galleryLib()]);
  const vars = themes[id];
  const item = gal.by.get(id);
  if (!vars || !item) throw new Error('missing');
  const th = { id, n: item.t, img: item.f, dark: vars.dark, vars };
  store.set(CACHE_KEY, th);
  markDirty('theme');
  paint(th);
  return th;
}

export function clearTheme() {
  store.del(CACHE_KEY);
  markDirty('theme');
  paint(null);
}

// 典藏馆大图里的「设为背景」按钮用得到
export function themeButton(id, { onChange } = {}) {
  const cur = activeTheme();
  if (cur && cur.id === id) {
    return {
      label: t('thmOn'), off: true,
      run: () => { clearTheme(); toast(t('thmCleared')); if (onChange) onChange(null); },
    };
  }
  return {
    label: t('thmSet'), off: false,
    run: async () => {
      try {
        const th = await setTheme(id);
        toast(t('thmApplied', { n: th.n }));
        if (onChange) onChange(th);
      } catch (e) {
        toast(e.message === 'locked' ? t('thmLocked') : t('thmFail'));
      }
    },
  };
}
