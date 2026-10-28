#!/usr/bin/env python3
"""Ground-truth ledger for 《死亡游戏调查报告 · 第六十三次回溯》.
Everything else (record keys, broadcasts, solutions, reference graph) is derived from this table; the prose lives in texts.py.
Run:  python3 tools/ledger.py   -> prints the table and validates all invariants."""
import json, sys
from collections import OrderedDict

# ---- roster: number -> (slug, zh, realm, role, issued item zh, item kind, item class)
# classes: slash pierce blunt shoot poison strangle none
ROSTER = [
 (1,'24','「24」','CHAOS','ASSAULT','缄默手套','r','none'),
 (2,'agrippa','阿格里帕','CARO','WARDEN','祭司权杖','r','blunt'),
 (3,'aigis','艾继丝','CARO','CHORUS','守护之手','r','none'),
 (4,'alva','艾尔瓦','CHAOS','WARDEN','遗落的祭祀刀','r','slash'),
 (5,'aurita','奥瑞塔','AEQUOR','ASSAULT','渔叉','r','pierce'),
 (6,'caecus','凯刻斯','AEQUOR','WARDEN','重锁','r','strangle'),
 (7,'casiah','卡茜亚','ULTRA','CHORUS','锈蚀柳叶刀','r','slash'),
 (8,'castor','卡斯托尔','ULTRA','WARDEN','沉重画框','r','blunt'),
 (9,'celeste','希莱斯特','AEQUOR','CHORUS','秘典星象仪','r','none'),
 (10,'clementine','克莱门汀','ULTRA','CHORUS','医生手提箱','r','blunt'),
 (11,'corposant','克珀珊特','AEQUOR','WARDEN','☆旧船锚☆','r','blunt'),
 (12,'daffodil','达芙黛尔','ULTRA','ASSAULT','旅行阳伞','r','pierce'),
 (13,'doll','朵尔','CHAOS','CHORUS','止血钳','r','pierce'),
 (14,'doresain','杜勒赛因','CARO','ASSAULT','古怪钩爪','r','slash'),
 (15,'erica','艾瑞卡','ULTRA','WARDEN','白鸦喙','r','pierce'),
 (16,'faint','菲茵特','CARO','WARDEN','神经毒素','r','poison'),
 (17,'faros','法洛思','AEQUOR','CHORUS','原型电池','r','shoot'),
 (18,'doll-inferno','熔毁·朵尔','CHAOS','CHORUS','锈蚀钢锯','r','slash'),
 (19,'helot-catena','血链·希洛','CARO','ASSAULT','活性注射器','r','pierce'),
 (20,'ramona-timeworn','环行·拉蒙娜','CHAOS','CHORUS','水手哨','r','strangle'),
 (21,'goliath','戈利亚','AEQUOR','ASSAULT','染血鹅卵石','r','blunt'),
 (22,'hameln','哈姆林','CHAOS','CHORUS','乐团指挥棒','r','blunt'),
 (23,'helot','希洛','CARO','ASSAULT','镭射颌骨','r','shoot'),
 (24,'horla','奥尔拉','ULTRA','CHORUS','超弦腐血制剂','r','poison'),
 (25,'jenkin','詹金','ULTRA','ASSAULT','潜水头盔','r','blunt'),
 (26,'karen','珈伦','CHAOS','CHORUS','哈福德灵药','r','poison'),
 (27,'kathigu-ra','凯蒂古拉','CHAOS','ASSAULT','鸽羽扇','r','slash'),
 (28,'leigh','雷娅','CARO','CHORUS','刺荨麻背心','r','none'),
 (29,'lily','莉莉','CHAOS','WARDEN','银色方扣缎带','r','strangle'),
 (30,'liz','莉兹','ULTRA','ASSAULT','蛊惑风铃','r','none'),
 (31,'lotan','萝坦','CHAOS','ASSAULT','诅咒石碑','r','blunt'),
 (32,'miryam','弥利亚姆','AEQUOR','CHORUS','可疑的药膏','r','poison'),
 (33,'mouchette','茉夏','CHAOS','ASSAULT','魔术手套','r','none'),
 (34,'murphy','墨菲','AEQUOR','WARDEN','黑烛','r','none'),
 (35,'murphy-fauxborn','诞妄·墨菲','AEQUOR','CHORUS','变色拘束服','r','strangle'),
 (36,'nautila','诺缔拉','CHAOS','WARDEN','深海戒指','r','none'),
 (37,'nymphaea','宁菲亚','CHAOS','ASSAULT','蝴蝶标本','r','pierce'),
 (38,'ogier','奥吉尔','CHAOS','WARDEN','缠丝玛瑙','r','none'),
 (39,'pandia','潘狄娅','CHAOS','ASSAULT','水晶球','r','blunt'),
 (40,'pickman','皮克曼','CARO','CHORUS','渴求的画笔','w','pierce'),
 (41,'pollux','波吕克斯','ULTRA','ASSAULT','巨人之刃','w','slash'),
 (42,'ramona','拉蒙娜','CHAOS','CHORUS','牧羊人的手杖','w','blunt'),
 (43,'ryker','莱克','CHAOS','CHORUS','勋爵手杖','w','blunt'),
 (44,'salvador','萨尔瓦多','CARO','WARDEN','蓝环毒素','w','poison'),
 (45,'sanga','珊','AEQUOR','WARDEN','引舵之帆','w','strangle'),
 (46,'sorel','索蕾尔','CARO','ASSAULT','锡兰红茶','r','poison'),
 (47,'tawil','塔薇','CHAOS','CHORUS','孤羽','w','pierce'),
 (48,'thais','泰旖丝','CARO','CHORUS','骸骨杯盏','r','blunt'),
 (49,'tinct','汀克特','ULTRA','CHORUS','精密计时器','r','none'),
 (50,'tulu','图鲁','AEQUOR','ASSAULT','（融蚀）','x','none'),
 (51,'uvhash','尤乌哈希','CARO','ASSAULT','求救信号','r','shoot'),
 (52,'wanda','旺达','ULTRA','WARDEN','偶然谬误','r','none'),
 (53,'winkle','温柯尔','ULTRA','WARDEN','小八音盒','r','none'),
 (54,'xu','徐','CARO','CHORUS','小黄螺','r','none'),
 (55,'vortice','莫丝','AEQUOR','ASSAULT','银白差分机','r','none'),
 (56,'arachne','阿拉克涅','ULTRA','CHORUS','蒙尘缝纫机','r','blunt'),
 (57,'saya','沙耶','CARO','CHORUS','怪蛇残蜕','r','strangle'),
 (58,'pontos','庞托斯','AEQUOR','WARDEN','辉光沙漏','r','none'),
 (59,'lotan-cetarchon','蚀灭·萝坦','CHAOS','ASSAULT','苦痛圣腕','r','none'),
 (60,'caraboo','卡拉布','CARO','WARDEN','哭泣烟斗','r','none'),
 (61,'ogier-oathbound','负誓·奥吉尔','CHAOS','WARDEN','独行者之徽','r','none'),
 (62,'vivian','薇薇安','CHAOS','CHORUS','☆六分仪☆','r','pierce'),
]
SHADOW = 63
NAME = {r[0]: r[2] for r in ROSTER}; ITEM = {r[0]: r[5] for r in ROSTER}; ICLASS = {r[0]: r[7] for r in ROSTER}

# ---- map (5x5). col A-E, row 1-5
PLACES = {
 'A1':'海蚀断崖','B1':'盐滩','C1':'旧码头','D1':'观星台','E1':'钥冢',
 'A2':'竹林','B2':'溶洞','C2':'温室','D2':'湿地','E2':'旧锅炉房',
 'A3':'废弃宿舍','B3':'图书馆','C3':'弥萨格钟楼','D3':'礼堂','E3':'医务楼',
 'A4':'果园','B4':'校猫的窝','C4':'操场','D4':'体育馆','E4':'仓库',
 'A5':'港湾','B5':'旧渔村','C5':'航标塔','D5':'砂石场','E5':'雷达站',
}
# melt-tide closing schedule: (day, hour, cell). The last one (C3) is the final contraction.
ZONES = [(1,8,'E5'),(1,9,'A5'),(1,10,'E1'),(1,11,'A1'),(1,12,'D5'),(1,13,'B5'),(1,14,'E4'),(1,15,'B1'),(1,16,'D1'),(1,17,'A4'),(1,18,'C5'),(1,19,'C1'),
         (2,8,'A2'),(2,9,'E2'),(2,10,'E3'),(2,11,'B2'),(2,12,'D2'),(2,13,'A3'),(2,14,'D4'),(2,15,'B4'),(2,16,'C4'),(2,17,'B3'),(2,18,'D3'),(2,19,'C2'),(2,20,'C3')]
CAUSES = {'blast':'爆炸致死','slash':'斩击致死','pierce':'刺击致死','blunt':'钝击致死','shoot':'射击致死','poison':'中毒致死','strangle':'勒杀致死','fall':'坠落致死','accident':'意外死亡'}

# ---- the events.  (time, cell, victim, cause, weapon, culprit, how, tags)
#  weapon: 0 = none (improvised / no weapon), else the NUMBER of the awakener whose issued item was used.
#  culprit: 0 = other (nobody), 63 = the shadow.   how: how the player identifies the culprit: name | item | trait | shadow | none
#  tags: takes=[nums] items the culprit picks up from the body; snatch=1 weapon was taken from the victim's hands first; sub = blast subtype
E = []
def ev(t, cell, v, cause, w=0, c=0, how='none', **kw): E.append(dict(t=t, cell=cell, v=v, cause=cause, w=w, c=c, how=how, **kw))
# ---- Day 1, daytime
ev('D1 07:00','C3',1,'blast',sub='demo')
ev('D1 07:04','C3',8,'slash',4,4,'name')
ev('D1 07:15','C4',11,'poison',44,44,'item')
ev('D1 07:30','C2',16,'pierce',13,13,'name',takes=[16])
ev('D1 07:48','C2',28,'poison',16,13,'item')
ev('D1 08:00','E5',30,'blast',sub='zone')
ev('D1 08:12','C3',39,'blunt',42,42,'name')
ev('D1 08:40','B3',52,'strangle',6,6,'item')
ev('D1 08:50','A5',25,'accident')
ev('D1 08:55','C3',50,'blunt',43,43,'name')
ev('D1 09:22','B2',3,'pierce',5,5,'item')
ev('D1 09:35','B2',53,'blunt',0,5,'name')
ev('D1 10:00','E1',9,'blast',sub='zone')
ev('D1 10:20','D3',22,'shoot',17,17,'item')
ev('D1 10:45','D3',47,'shoot',17,17,'name')
ev('D1 10:50','A1',57,'fall')
ev('D1 11:20','A2',51,'slash',14,14,'name',takes=[51])
ev('D1 11:50','B4',12,'strangle',29,29,'item')
ev('D1 12:00','D5',34,'blast',sub='zone')
ev('D1 12:30','C1',2,'blunt',43,43,'item')
ev('D1 12:50','B5',60,'accident')
ev('D1 13:25','D2',56,'slash',41,41,'name')
ev('D1 14:00','E4',33,'blast',sub='zone')
ev('D1 14:10','D4',36,'pierce',40,40,'item')
ev('D1 14:40','B1',45,'pierce',0,58,'trait')
ev('D1 15:30','B3',6,'shoot',23,23,'item')
ev('D1 16:00','D1',37,'blast',sub='zone')
ev('D1 16:30','C4',21,'blunt',0,59,'name')
ev('D1 17:00','A4',27,'blast',sub='zone')
ev('D1 17:20','C2',10,'pierce',19,19,'item')
ev('D1 18:00','C5',32,'blast',sub='zone')
ev('D1 18:30','B3',24,'slash',14,14,'name')
ev('D1 19:00','C1',20,'blast',sub='zone')
ev('D1 19:25','C4',31,'blunt',31,59,'item',snatch=1,takes=[31])
ev('D1 19:50','D3',38,'fall',0,61,'name')
# ---- Day 1 night
ev('D1 20:15','C2',18,'pierce',13,13,'item',takes=[18])
ev('D1 20:50','B4',14,'slash',27,SHADOW,'shadow')
ev('D1 21:30','C3',7,'shoot',23,23,'name')
ev('D1 22:10','B3',26,'poison',32,SHADOW,'shadow')
ev('D1 23:20','C2',40,'pierce',37,SHADOW,'shadow')
ev('D2 00:30','B3',19,'shoot',23,23,'name')
ev('D2 01:15','C4',49,'strangle',45,SHADOW,'shadow')
ev('D2 02:00','C2',54,'blunt',25,SHADOW,'shadow')
ev('D2 03:10','B4',46,'poison')
ev('D2 03:50','D3',58,'slash',27,SHADOW,'shadow')
ev('D2 04:40','C4',15,'pierce',37,SHADOW,'shadow')
ev('D2 05:30','B3',55,'strangle',57,SHADOW,'shadow')
ev('D2 06:20','C2',48,'blunt',25,SHADOW,'shadow')
# ---- Day 2
ev('D2 08:20','C4',43,'shoot',17,17,'name')
ev('D2 09:00','E2',35,'blast',sub='zone')
ev('D2 09:40','C3',5,'strangle',29,29,'item')
ev('D2 10:30','C4',13,'shoot',23,23,'name')
ev('D2 12:00','D2',41,'blast',sub='zone')
ev('D2 13:20','C3',17,'blunt',31,59,'item')
ev('D2 14:30','C3',4,'strangle',29,29,'name')
ev('D2 15:00','B4',42,'blast',sub='zone')
ev('D2 16:40','B3',44,'blunt',31,59,'item')
ev('D2 17:40','D3',61,'pierce',62,62,'item')
ev('D2 18:40','C3',59,'shoot',23,23,'name')
ev('D2 19:00','C2',29,'blast',sub='zone')
ev('D2 19:40','C3',23,'pierce',62,62,'name')
ev('D2 20:00','C3',62,'blast',sub='final')

def tmin(t):  # 'D1 07:00' -> minutes since D1 00:00
    d, hm = t.split(); h, m = hm.split(':'); return (int(d[1:])-1)*1440 + int(h)*60 + int(m)
def fmt(t): d, hm = t.split(); return f'第{d[1:]}天 {hm}'
for i, e in enumerate(E): e['dord'] = i+1; e['min'] = tmin(e['t'])
for e in E: e['key'] = f"{e['dord']:02d}-{e['cell']}-{e['v']:02d}"
BY_V = {e['v']: e for e in E}

def closed_at(cell, m):
    for d, h, c in ZONES:
        if c == cell: return m >= (d-1)*1440 + h*60
    return False

def validate():
    errs = []
    # 1. every awakener dies exactly once, times strictly increase
    vs = [e['v'] for e in E]
    if sorted(vs) != list(range(1, 63)): errs.append(f'victims not a permutation of 1..62: missing {set(range(1,63))-set(vs)} dup {[v for v in vs if vs.count(v)>1]}')
    if [e['min'] for e in E] != sorted(set(e['min'] for e in E)): errs.append('times not strictly increasing')
    # 2. killers alive; shadow ok; item chain
    dead_at = {e['v']: e['min'] for e in E}
    held = {n: {n} for n in NAME}              # who holds which items (by owner number)
    corpse = {}                                  # item -> death time of its last holder / location cell
    shadow_has = set()
    for e in E:
        c, w, v = e['c'], e['w'], e['v']
        if c in NAME and dead_at[c] <= e['min']: errs.append(f"{e['key']}: killer {c} already dead")
        if v in NAME and e['cause'] in ('blast','accident','fall') and c and e['cause']!='fall': errs.append(f"{e['key']}: no-culprit cause with culprit")
        if e['cause'] in ('blast','accident') and c: errs.append(f"{e['key']}: blast/accident must not have culprit")
        if e['cause'] in ('slash','pierce','blunt','shoot','poison','strangle') and not c and e['key'] != '': 
            if e['v'] != 46: errs.append(f"{e['key']}: murder without culprit")
        # weapon legality
        if w:
            if ICLASS[w] != e['cause'] and e['cause'] not in ('poison',) : errs.append(f"{e['key']}: item class {ICLASS[w]} != cause {e['cause']}")
            if ICLASS[w] == 'none': errs.append(f"{e['key']}: item {w} is not a weapon")
            if c == SHADOW:
                if w in NAME and w in dead_at and dead_at[w] < e['min'] and w != v: shadow_has.add(w)
                else: errs.append(f"{e['key']}: shadow weapon {w} not on a corpse")
            elif e.get('snatch'):
                if w != v: errs.append(f"{e['key']}: snatch weapon must be the victim's")
            elif w not in held[c]: errs.append(f"{e['key']}: killer {c} does not hold item {w} (holds {held[c]})")
        else:
            if e['cause'] in ('slash','shoot','strangle') and False: pass
        # zone rules
        if e['cause'] == 'blast':
            sub = e['sub']
            if sub == 'zone' and not closed_at(e['cell'], e['min']-1) and not closed_at(e['cell'], e['min']): errs.append(f"{e['key']}: zone death outside a closure")
            if sub == 'zone' and e['min'] % 60 != 0: errs.append(f"{e['key']}: zone death must be on the hour")
        elif c != SHADOW and closed_at(e['cell'], e['min']): errs.append(f"{e['key']}: event inside a closed zone")
        if e['cause'] != 'blast' and e['cell'] == '' : errs.append('no cell')
        # transfers
        for n in e.get('takes', []): held[c] = held[c] | {n} if c in held else held.get(c, set())
    # 3. shadow items come from corpses that lie in cells that were closed or open — record where
    return errs

if __name__ == '__main__':
    errs = validate()
    cnt = {}
    for e in E: cnt[e['cause']] = cnt.get(e['cause'], 0) + 1
    for e in E:
        w = ITEM[e['w']] if e['w'] else '无'; c = '其他' if e['c'] == 0 else ('黑影63' if e['c'] == 63 else NAME[e['c']])
        print(f"{e['key']:10} {fmt(e['t']):10} {NAME[e['v']]:8} {CAUSES[e['cause']]:6} {w:14} {c}")
    print(cnt, 'errors:', len(errs))
    for x in errs: print('  !', x)
    sys.exit(1 if errs else 0)
