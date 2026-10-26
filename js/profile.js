// 个人中心：账号资料、头像、推理战绩
import { $, h, store, nav, t, wallet, failedBank, unlocked, toast } from './common.js';
import { auth, openLogin, avatarLib, nameOfMail } from './auth.js';

document.body.prepend(nav('profile'));
const root = $('#app');

const stat = () => store.get('stats', { played: 0, won: 0, streak: 0, best: 0, fields: 0, totalFields: 0 });
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const day = (iso) => (iso ? String(iso).slice(0, 10) : '—');

function meter(label, value, sub) {
  return h('div', { class: 'statbox' }, h('small', {}, label), h('b', {}, value), sub ? h('small', { class: 'dim' }, sub) : null);
}

function guestView() {
  return h('section', { class: 'card authhero' },
    h('div', { class: 'authart' }, h('img', { src: 'assets/avatars/cg-CG_C201_001.webp', alt: '' })),
    h('div', {},
      h('h2', {}, t('pfGuestTitle')),
      h('p', { class: 'note' }, t('pfGuestSub')),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, t('pfLoginBtn')),
        h('a', { class: 'btn ghost', href: 'index.html' }, t('navGame')))));
}

function hero(u) {
  return h('section', { class: 'card pfhero' },
    h('img', { class: 'pfavatar', src: auth.avatarOf(u), alt: '', width: 96, height: 96 }),
    h('div', { class: 'pfmeta' },
      h('h2', {}, u.name || t('pfNoName')),
      h('p', { class: 'note' }, `@${nameOfMail(u.mail)} · ${t('pfJoined')} ${day(u.created)}`),
      h('p', { class: 'note dim' }, t('pfStoreNote'))),
    h('div', { class: 'pfstats' },
      meter(t('credits'), `◈ ${wallet.get()}`),
      meter(t('pfPlayed'), stat().played, `${t('pfWinRate')} ${pct(stat().won, stat().played)}%`),
      meter(t('pfUnlockedCg'), unlocked.list().length),
      meter(t('pfFailed'), failedBank.list().length)));
}

function editBox(u) {
  let picked = u.avatar || '';
  const nameEl = h('input', { type: 'text', value: u.name || '', maxlength: 20, placeholder: t('pfNamePh') });
  const urlEl = h('input', { type: 'text', value: u.avatar && !u.avatar.includes('assets/avatars/') ? u.avatar : '', placeholder: 'https://…' });
  const preview = h('img', { class: 'pfavatar small', src: auth.avatarOf(u), alt: '' });
  const grid = h('div', { class: 'avgv' });

  const setPick = (src) => {
    picked = src;
    preview.src = src || auth.avatarOf(u);
    grid.querySelectorAll('.avg').forEach((b) => b.classList.toggle('on', b.dataset.src === picked));
    if (src && src.includes('assets/avatars/')) urlEl.value = '';
  };

  avatarLib().then((list) => {
    grid.replaceChildren(...list.map((a) => h('button', {
      type: 'button', class: `avg${a.src === picked ? ' on' : ''}`, 'data-src': a.src, title: a.n,
      onclick: () => setPick(a.src),
    }, h('img', { src: a.src, alt: a.n, loading: 'lazy' }))));
    if (!picked) setPick(list[0] ? list[0].src : '');
  });

  urlEl.addEventListener('input', () => {
    const v = urlEl.value.trim();
    if (v) setPick(v);
  });

  const save = async () => {
    const btn = saveBtn;
    btn.disabled = true;
    try {
      const avatar = (urlEl.value.trim() || picked || '').slice(0, 250);
      await auth.update({ name: nameEl.value.trim() || u.name, avatar });
      toast(t('pfSaved'));
      render();
    } catch (e) {
      toast(`${t('pfSaveFail')}：${e.message}`);
    } finally {
      btn.disabled = false;
    }
  };
  const saveBtn = h('button', { class: 'btn', onclick: save }, t('save'));

  return h('section', { class: 'card' },
    h('h3', {}, t('pfEdit')),
    h('div', { class: 'pfeditrow' },
      preview,
      h('div', { class: 'pfeditflds' },
        h('label', { class: 'fld' }, h('small', {}, t('pfNick')), nameEl),
        h('label', { class: 'fld' }, h('small', {}, t('pfAvatarUrl')), urlEl))),
    h('p', { class: 'note' }, t('pfAvatarNote')),
    grid,
    h('div', { class: 'actions' },
      saveBtn,
      h('button', {
        class: 'btn ghost',
        onclick: () => { auth.logout(); toast(t('pfLoggedOut')); setTimeout(() => location.reload(), 400); },
      }, t('pfLogout'))));
}

function render() {
  const u = auth.user;
  const kids = [
    h('section', { class: 'pagehead' }, h('h1', {}, t('pfTitle')), h('p', { class: 'note' }, t('pfSub'))),
    u ? hero(u) : guestView(),
    u ? editBox(u) : null,
    h('section', { class: 'card' },
      h('h3', {}, t('pfLocal')),
      h('p', { class: 'note' }, t('pfLocalNote')),
      h('div', { class: 'actions' },
        h('button', {
          class: 'btn ghost danger',
          onclick: () => {
            if (!confirm(t('pfClearAsk'))) return;
            ['credits', 'cg', 'failed', 'stats', 'myPuzzles', 'profile'].forEach((k) => store.del(k));
            toast(t('pfCleared'));
            setTimeout(() => location.reload(), 500);
          },
        }, t('pfClear')))),
  ].filter(Boolean);
  root.replaceChildren(...kids);
}

render();
window.__pfRender = render;   // 供 scripts/preview.mjs 的交互探针重绘
