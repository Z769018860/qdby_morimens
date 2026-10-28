# -*- coding: utf-8 -*-
import ed_62s as _s
from ed_62_events import ZONES, EVENTS, PLACES
import ledger
MAIN = ledger.MAIN_ROSTER; CAST = [r[2] for r in MAIN] + ['威廉']
from ed_prose import build
META = dict(_s.META, boot=['> 记录复原终端　启动中……', '> 钥冢档案室内网　………　已确认（特级）', '> 检索到上一届的备份　部分记录可读', '> 参加者：六十三名　·　生存者：一名', '> 其中一人的名字，上一届还不在名册上。']); EXTRA = _s.EXTRA; LORE_EXTRA = _s.LORE_EXTRA; AVATAR_EXTRA = _s.AVATAR_EXTRA
import ed_62_story as _st
NUM = {nm: i + 1 for i, nm in enumerate(CAST)}
PROSE = build(62, EVENTS, CAST, MAIN, _s, PLACES, {NUM[k]: v for k, v in _st.STORY.items()}, 64, [(NUM[a], NUM[b], *r) for a, b, *r in _st.PAIRS])
OVER = _s.OVER; FINALS = _s.FINALS; MSGS = _s.MSGS; ENDING = _s.ENDING; MILE = ['共鸣 1/20\u3000雪落在剧场的屋顶上。', '共鸣 2/20\u3000乐池里的琴弦，断了一根。', '共鸣 3/20\u3000有人认出了自己死过一次。', '共鸣 4/20\u3000镜子里，有一个孩子在数自己。', '共鸣 5/20\u3000后台的灯，灭了一半。', '共鸣 6/20\u3000观众席上，没有一个观众。', '共鸣 7/20\u3000道具库里，假血和真血混在了一起。', '共鸣 8/20\u3000雪地广场上，有人留下了脚印。', '共鸣 9/20\u3000第二幕。', '共鸣 10/20\u3000钟摆声，隔着一道门。', '共鸣 11/20\u3000化妆间的镜子，裂了。', '共鸣 12/20\u3000有人在花园里，对纸花说话。', '共鸣 13/20\u3000雪停了一会儿。', '共鸣 14/20\u3000你开始习惯他们的口吻了。', '共鸣 15/20\u3000冰窖里，传来很轻的歌声。', '共鸣 16/20\u3000有人在钟楼门口，等。', '共鸣 17/20\u3000猫从灯架上跳了下来。', '共鸣 18/20\u3000最后一幕的幕布，在升起。', '共鸣 19/20\u3000只剩下回声。', '共鸣 20/20\u3000孩子，一直站在门口。']
