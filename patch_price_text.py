import io, sys

def patch(path, pairs):
    with io.open(path, 'rb') as f:
        data = f.read()
    for old, new in pairs:
        ob, nb = old.encode('utf-8'), new.encode('utf-8')
        n = data.count(ob)
        if n != 1:
            print('MISS(%d) %s :: %s' % (n, path, old[:40]))
            sys.exit(1)
        data = data.replace(ob, nb)
    with io.open(path, 'wb') as f:
        f.write(data)
    print('ok', path, len(data))

# ---- js/bazaar.js 新手引导 ----
js_pairs = [
 ('开局你只有 <b>32 金</b>：刚好够招 <b>2 个 1 格唤醒体</b>，或者 <b>1 个唤醒体 + 1 条命轮</b>。',
  '开局你只有 <b>32 金</b>，价钱不高：<b>1 格唤醒体 12 金 / 2 格 17 金 / 3 格 22 金</b>，命轮大致 <b>11~17 金</b>（越费算力越贵）。所以开局够招 <b>2 个 1 格唤醒体</b>，或者 <b>1 个唤醒体 + 1 条命轮</b>，还能剩点刷新钱。'),
 ('不想要这批货可以「刷新」（要花钱）。',
  '不想要这批货可以「刷新」（2 金起，当天越刷越贵）。'),
 ('刷新一次只要 1 金，多刷几次挑想要的。',
  '刷新 2 金起，当天每刷一次再贵 1 金。'),
]
patch('js/bazaar.js', js_pairs)

# ---- src/pages/bazaar.html ----
html_pairs = [
 ('开局自带 <b id="introGold">30</b> 金币', '开局自带 <b id="introGold">32</b> 金币'),
 ('之后每换一次 1 金，和刷新同价。', '之后每换一次 1 金（刷新是 2 金起，当天越刷越贵）。'),
 ('（本命命轮和战场上最后一个人不能卖）。刷新一次只要 1 金。</p>',
  '（本命命轮和战场上最后一个人不能卖）。刷新 2 金起，当天越刷越贵。</p>'),
 ('      <h4>仓库与卖出</h4>\r\n',
  '      <h4>价钱怎么算</h4>\r\n'
  '      <p>唤醒体按站位宽窄定价：<b>1 格 12 金、2 格 17 金、3 格 22 金</b>；命轮按耗算力定价，<b>11~17 金</b>，越费算力越贵。开局 32 金够招两个 1 格唤醒体，或者一个唤醒体加一条命轮，<b>还能剩几金刷新</b>。卖掉返还一半。密契「诅咒兔」全场 −20%，「甜蜜蛞蝓」+15% 换命轮伤害。</p>\r\n'
  '      <h4>仓库与卖出</h4>\r\n'),
]
patch('src/pages/bazaar.html', html_pairs)
