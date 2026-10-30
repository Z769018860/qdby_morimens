import io, sys

P = 'js/sv/ui.js'
s = io.open(P, encoding='utf-8', newline='').read()

def sub(a, b, cnt=1):
    global s
    a2 = a.replace('\n', '\r\n'); b2 = b.replace('\n', '\r\n')
    if a2 not in s:
        print('MISS:', a2.split('\r\n')[0][:70]); sys.exit(1)
    s = s.replace(a2, b2, cnt)

# ---- 角色小头像的 HTML：有立绘走图集，彩蛋角色走徽章
sub("""// 有立绘走图集，没有立绘走彩蛋徽章（null 仍然是神秘唤醒体的剪影）
export function faceStyle(c, size) {
  if (c && c.egg) return eggStyle(c, size);
  return atlasStyle(c ? c.img : null, size);
}""",
    """// 有立绘走图集，没有立绘走彩蛋徽章（null 仍然是神秘唤醒体的剪影）
export function faceStyle(c, size) {
  if (c && c.egg) return eggStyle(c, size);
  return atlasStyle(c ? c.img : null, size);
}

// 直接给一段 <i>：HUD 技能槽、构筑详情、超武卡都要「这是谁的技能」，
// 三处写法一样，抽出来免得每加一种头像就漏掉一处（漏了就是一块黑方块）。
export function charFaceHTML(charId, size, cls) {
  const c = CHARS.find((x) => String(x.id) === String(charId));
  const k = cls ? cls + ' ' : '';
  if (c && c.egg) {
    return `<i class="${k}egg-face" style="${eggStyle(c, size)}font-size:${Math.round(size * 0.46)}px">${esc(c.glyph || '')}</i>`;
  }
  return `<i class="${k.trim()}" style="${atlasStyle(c ? c.img : null, size)}"></i>`;
}""")

# ---- 超武觉醒卡的头像
sub("""    <i style="${atlasStyle(e.frame, 40)}"></i>""",
    """    ${charFaceHTML(e.char, 40)}""")

# ---- 构筑详情：每把技能属于谁
sub("""      <i style="${atlasStyle(charFrame(x.def.char), 34)}"></i>""",
    """      ${charFaceHTML(x.def.char, 34)}""")

# ---- HUD 技能槽
sub("""        <i style="${atlasStyle(charFrame(w.def.char), 30)}"></i>""",
    """        ${charFaceHTML(w.def.char, 30)}""")

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('ui2 OK')
