#!/usr/bin/env python3
"""把「卡牌 id → 卡牌类型」整理成 data/card-types.json。

数据来源：官方回放 `BattleReplay_<uuid>.json` 里的 `resourceRecords.Skill` 表。
每条技能/卡牌记录都带 `Type`（Card_Strike / Card_Defend / Card_Skill / Card_Awake /
Card_Extend / Card_Curse / Card_State / Card_Potion …），这是游戏自己的分类，
比按名字猜可靠。回放是 LZ4 帧 + MessagePack，解包脚本见 `.tmp-cards/probe.py` /
`.tmp-cards/mine.py`（不进版本库），挖出来的结果落在 `.tmp-cards/skills.json`。

这里只导出「牌组里会出现的卡」用得到的类型，顺手把英文类型压成短码：
    curse  症状卡      extend 衍生卡（游戏里叫延展）    strike/defend/skill 指令卡
    awake  觉醒卡      state  状态卡                   potion 药剂
其余（Keeper_Skill / Ulti_Skill / Intent_* 等）不是牌组卡，丢掉。

用法：
    python3 scripts/build_card_types.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '.tmp-cards/skills.json'
OUT = ROOT / 'data/card-types.json'

CODE = {
    'Card_Curse': 'curse',
    'Card_Extend': 'extend',
    'Card_Strike': 'strike',
    'Card_Defend': 'defend',
    'Card_Skill': 'skill',
    'Card_Awake': 'awake',
    'Card_State': 'state',
    'Card_Potion': 'potion',
    'Card_AttachPost': 'attach',
}


def main():
    if not SRC.exists():
        raise SystemExit(f'缺少 {SRC}：先用 .tmp-cards/mine.py 挖一批官方回放（见文件头说明）')
    skills = json.load(open(SRC, encoding='utf-8'))
    out = {}
    for tid, e in skills.items():
        code = CODE.get(e.get('t'))
        if code:
            out[str(tid)] = code
    OUT.write_text(json.dumps(out, ensure_ascii=False, sort_keys=True, separators=(',', ':')), encoding='utf-8')
    from collections import Counter
    print(f'{OUT.name}: {len(out)} 张卡', Counter(out.values()).most_common())


if __name__ == '__main__':
    main()
