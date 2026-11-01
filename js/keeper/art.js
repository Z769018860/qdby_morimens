// 杀死守密人 —— 素材清单。
// 全部背景取自本站典藏馆：assets/gallery/*.webp（900×415，《忘却前夜》游戏素材，
// 版权归 Qookka Games，非商业同人使用，见 NOTICE.md）。
// 用法：bg(id) 返回文件路径；按场景分组，方便在文案里按情绪挑。

const G = (id) => `assets/gallery/${id}.webp`;

export const CG = {
  // 开场与规程
  title:      G('cg-c02-004'),   // 她在玻璃后面，隔着框伸出手
  city:       G('cg-c00-011'),   // 夜里的弥萨格街，黑色人影
  city2:      G('cg-c00-012'),   // 近一点，白发的她在看你
  hall:       G('cg-c08-003'),   // 暗厅里一束顶光
  // 下行（钥冢的楼梯）
  shaft:      G('cg-c07-010'),   // 从很高处落下的一线光，往下看是井
  spiral:     G('cg-c07-012'),   // 灰色的螺旋纹
  pit:        G('cg-c07-011'),   // 黑水与沉链
  voidwalk:   G('cg-sd-l-d06-1'),// 一片黑里立着一个人
  // 门
  door:       G('cg-c08-011'),   // 一道竖直的白光缝
  // 形态
  binder:     G('cg-c02-004'),   // 装订者：玻璃框后面的人
  binder2:    G('cg-c02-005'),   // 她把手伸出框来
  binder3:    G('cg-c02-006'),   // 手更出来了
  trimmer:    G('cg-c06-004'),   // 裁页者：提着刀俯身下来的人
  lamplight:  G('cg-c01-001'),   // 执灯人：坐在巨大的灯里
  lamplight2: G('cg-c02-001'),   // 灯油的暖光下
  tower:      G('cg-c202-003'),  // 塔：烟一样的巨人
  tower2:     G('cg-c205-002'),  // 红幕布前的她
  salt:       G('cg-c02-003'),   // 盐：水线以下的人
  salt2:      G('cg-sd-l-c10-2'),// 水下散开的头发
  myriad:     G('cg-c203-007'),  // 万卷：银盘上的宴席
  hollow:     G('cg-c204-009'),  // 空守：蒙着眼悬着的人
  lastday:    G('cg-c09-010'),   // 终天者：白底上的笑
  cat:        G('cg-c09-009'),   // 猫：手心里一团暖光
  unnamed:    G('cg-c01-003'),   // 未命名：空白上的一行飞鸟
  mirror:     G('cg-c205-014'),  // 镜：红幕布与垂坠的镜子
  // 终夜
  desk:       G('cg-c203-006'),  // 红光里的桌子
  bottom:     G('cg-c204-007'),  // 钥冢最底：很小的人影
  strings:    G('cg-c205-006'),  // 提线
  hands:      G('cg-c205-004'),  // 合拢的白手
  // 情绪
  kill:       G('cg-c204-004'),  // 深红里的巨手
  kill2:      G('cg-c204-005'),  // 红光贴近的脸
  warm:       G('cg-c09-012'),   // 手里捧着一点光
  flower:     G('cg-c204-001'),  // 红底上的白花
  pearl:      G('cg-c09-009'),
  eye:        G('cg-c03-001'),   // 黑暗里睁开的眼睛
  end:        G('cg-c204-001'),
  end2:       G('cg-c204-011'),  // 红涡里的花
  end3:       G('cg-c205-015'),  // 红线缠住的手
  blank:      G('cg-c01-002'),   // 灰白的空
  birds:      G('cg-c01-003'),
};

// 声音（四界域的回响）：文案里给选项标 realm，引擎在面板下面回一行。
export const REALM = {
  chaos: { zh: '混沌', color: '#e8656f' },
  caro:  { zh: '血肉', color: '#d98b6a' },
  aqua:  { zh: '深海', color: '#5b9bd5' },
  ultra: { zh: '超维', color: '#e3b341' },
};
