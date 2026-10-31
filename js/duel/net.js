// 好友房：这个站没有自己的后端（GitHub Pages 只有静态文件），
// 所以房间用一个公共的 pub/sub 当信箱：双方订阅同一个「房间主题」，
// 自己发的消息自己也会收到，用 from 过滤掉。
//
// 选 ntfy.sh 的原因：GET/POST 都开 CORS（Access-Control-Allow-Origin: *），
// 支持 SSE 长连接（一条连接接收，不会像轮询那样把免费配额烧光），
// 消息在服务端留 12 小时，中途掉线重连还能补上。
//
// 协议（房间里的每条消息都是这层 JSON）：
//   { k:'hi',   role:'a'|'b', deck:'d1' }         握手，每 5 秒重发一次直到对方应答
//   { k:'open', seed:123, a:'d1', b:'d3' }        房主定种子与双方卡组（a=房主）
//   { k:'ack' }                                    客人收到 open
//   { k:'act',  n:1, a:{t:'summon',uid:3} }        动作，n 从 1 递增，双方按序重放
//   { k:'ping' }                                   心跳
//   { k:'bye' }                                    退出
const RELAY = 'https://ntfy.sh';
const PREFIX = 'mrd1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 I O 0 1，念出来不会错

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

  function open() {
    try {
      es = new EventSource(url + '/sse');
    } catch (e) {
      if (onState) onState('err');
      return;
    }
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
  }

  open();

  return {
    code,
    me,
    send(obj) {
      if (closed) return;
      const body = JSON.stringify(Object.assign({}, obj, { from: me }));
      // 关掉 keepalive 之外的权限：这里只要最简单的匿名发布
      fetch(url, { method: 'POST', body, headers: { 'X-Title': 'morimens-duel' } })
        .catch(() => { if (onState) onState('err'); });
    },
    close() {
      closed = true;
      try { if (es) es.close(); } catch (e) { /* 已经关了 */ }
    },
  };
}
