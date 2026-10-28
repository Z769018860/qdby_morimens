# -*- coding: utf-8 -*-
import ed_61s as _s
from ed_61_events import ZONES, EVENTS, PLACES
import ledger
MAIN = ledger.MAIN_ROSTER; CAST = [r[2] for r in MAIN] + ['威廉']
META = dict(_s.META, boot=['> 记录复原终端　启动中……', '> 钥冢档案室内网　………　已确认（特级）', '> 检索到更早的备份　海水的味道', '> 参加者：六十三名　·　生存者：一名', '> 名册之外，似乎还有人在场。']); EXTRA = _s.EXTRA; LORE_EXTRA = _s.LORE_EXTRA; AVATAR_EXTRA = _s.AVATAR_EXTRA
NUM = {nm: i + 1 for i, nm in enumerate(CAST)}
# 正文全部手写：第一天在 ed_61_text，第二天在 ed_61_text2（模板生成的版本已废弃）
from ed_61_text import T1
from ed_61_text2 import T2
TEXT = {**T1, **T2}
PROSE = {NUM[k]: v for k, v in TEXT.items()}
OVER = _s.OVER; FINALS = _s.FINALS; MSGS = _s.MSGS; ENDING = _s.ENDING; MILE = ['共鸣 1/20\u3000雾，从港口漫上来。', '共鸣 2/20\u3000船，在远处沉下去。', '共鸣 3/20\u3000有人在吧台边坐下。', '共鸣 4/20\u3000礼帽的影子，落在栈桥上。', '共鸣 5/20\u3000潮水涨了一格。', '共鸣 6/20\u3000酒馆里，筹码落在桌上。', '共鸣 7/20\u3000灯塔的灯，亮了一下。', '共鸣 8/20\u3000有人在鱼市里，数着鳞片。', '共鸣 9/20\u3000雾堤上，有人在喊名字。', '共鸣 10/20\u3000钟声，从很远的地方传来。', '共鸣 11/20\u3000沉船的桅杆，断了。', '共鸣 12/20\u3000码头上，只剩下缆绳。', '共鸣 13/20\u3000雾里，有人在笑。', '共鸣 14/20\u3000礼貌的声音，说：好久不见。', '共鸣 15/20\u3000海面平得像一面镜子。', '共鸣 16/20\u3000你开始数不清，还剩几个人。', '共鸣 17/20\u3000神明，在胸口里翻了个身。', '共鸣 18/20\u3000最后一格潮水，正在涨起来。', '共鸣 19/20\u3000它，快醒了。', '共鸣 20/20\u3000下注的人，在观众席里，坐直了。']
SHADOW_MSG = _s.SHADOW_MSG; SHADOW_LABEL = _s.SHADOW_LABEL
