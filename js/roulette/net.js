// 好友房：这个站没有自己的后端，房间借一个公共的 pub/sub 当中继信箱——
// 双方订阅同一个「房间主题」，自己发的消息自己也会收到，用 from 过滤掉。
//
// 和唤醒王：决斗链接（js/duel/net.js）是同一套路子，只是换了主题前缀：
// 两个游戏同时开房不会串台。前缀变了也别改长度——房间码 5 位、全大写，
// 念给朋友听不会错（去掉了 I O 0 1）。
//
// 协议（每条消息都是这一层 JSON）：
//   { k:'hi',   role:'a'|'b', ch:'a-15567' }       握手，每 3 秒重发直到对方应答
//   { k:'open', seed:123, a:'a-15567', b:'a-15576' }  房主定种子与双方唤醒体（a=房主）
//   { k:'ack' }                                     客人收到 open
//   { k:'act',  n:1, a:{t:'shoot',target:'foe'} }   动作，n 从 1 递增，双方按序重放
//   { k:'ping' } / { k:'bye' }
const RELAY = 'https://ntfy.sh';
const PREFIX = 'mrr1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 I O 0 1

export function makeCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

export function normCode(v) {
  const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 5 ? s : '';
}

export function roomUrl(code) {
  return RELAY + '/' + PREFIX + String(code).toLowerCase();
}

// onMsg(payload) / onState('on'|'err'|'closed')
export function connect(code, onMsg, onState) {
  const url = roomUrl(code);
  const me = 'c' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  let es = null;
  let closed = false;

  try {
    es = new EventSource(url + '/sse');
    es.onopen = () => { if (onState) onState('on'); };
    es.onerror = () => { if (!closed && onState) onState('err'); }; // EventSource 自己会重连
    es.onmessage = (ev) => {
      let box = null;
      try { box = JSON.parse(ev.data); } catch (e) { return; }
      if (!box || box.event !== 'message' || !box.message) return; // keepalive / open 事件
      let p = null;
      try { p = JSON.parse(box.message); } catch (e) { return; }
      if (!p || p.from === me) return;
      if (onMsg) onMsg(p, box.time || 0);
    };
  } catch (e) {
    if (onState) onState('err');
  }

  return {
    code,
    me,
    send(obj) {
      if (closed) return;
      const body = JSON.stringify(Object.assign({}, obj, { from: me }));
      fetch(url, { method: 'POST', body, headers: { 'X-Title': 'morimens-roulette' } })
        .catch(() => { if (onState) onState('err'); });
    },
    close() {
      closed = true;
      try { if (es) es.close(); } catch (e) { /* 已经关了 */ }
    },
  };
}
