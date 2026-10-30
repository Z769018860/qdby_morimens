#!/usr/bin/env python3
"""Audit measured replay-summary fields against every generated detective puzzle.
Usage: python3 scripts/audit_replay_metrics.py /path/to/raw-summary-dir
No guessing: missing source or mismatched values produce nonzero exit status.
Supports both <season>-battle-summary.jsonl.gz and dzone/season<season>/battle-summary.jsonl.gz.
"""
import argparse, gzip, json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = {
    "keeper": "playerDamage",
    "tentacle": "maxTentacleDamage",
    "counter": "maxCounterAtt",
    "strength": "maxStrength",
    "poison": "maxPosion",
}
BOSS = {
    (71,1): ["80576","80577"], (71,2): ["94940"],
    (71,3): ["67103"], (71,4): ["14063"], (71,5): ["81279"],
    (72,1): ["14008","14013"], (72,2): ["14064"],
    (72,3): ["60096"], (72,4): ["120308","120310","120306"],
    (72,5): ["14086"],
}

def puzzles():
    seen = set()
    for rel in ("data/puzzles.json", "data/puzzles-extra.json", "data/puzzles-more.json"):
        path = ROOT / rel
        if not path.exists() or not path.stat().st_size:
            continue
        for p in json.loads(path.read_text(encoding="utf8"))["puzzles"]:
            if p["id"] not in seen:
                seen.add(p["id"])
                yield p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path, help="directory containing original summary JSONL.gz files")
    args = ap.parse_args()
    qs = list(puzzles())
    errors = []
    summaries = {}
    seasons = sorted({p["season"] for p in qs})
    for season in seasons:
        candidates = (
            args.source / f"{season}-battle-summary.jsonl.gz",
            args.source / f"dzone/season{season}/battle-summary.jsonl.gz",
        )
        path = next((x for x in candidates if x.exists()), None)
        if not path:
            errors.append(f"season {season}: raw battle summary absent")
            continue
        with gzip.open(path, "rt", encoding="utf8") as stream:
            for line in stream:
                row = json.loads(line)
                uuid = row.get("battleUuid")
                if uuid:
                    summaries[(season, str(uuid))] = row
    tally = Counter()
    for p in qs:
        pid = p["id"]
        expected_boss = BOSS.get((p["season"], p["zone"]))
        if expected_boss and list(map(str, p.get("boss") or [])) != expected_boss:
            errors.append(f"{pid}: boss mismatch")
        uuid = p.get("uuid")
        if not uuid:
            errors.append(f"{pid}: replay UUID missing")
            continue
        raw = summaries.get((p["season"], str(uuid)))
        if raw is None:
            errors.append(f"{pid}: original summary not found for {uuid}")
            continue
        tally["matched"] += 1
        for key, source in FIELDS.items():
            if source not in raw or raw[source] is None:
                tally["unavailable_" + source] += 1
                continue
            actual = (p.get("dmgComp") or {}).get(key)
            if actual is None:
                errors.append(f"{pid}: measured field {key} absent in puzzle")
            elif actual != raw[source]:
                errors.append(f"{pid}: {key} {actual} != source {raw[source]}")
            else:
                tally["verified_" + key] += 1
        if p.get("playerDmg") != raw.get("playerDamage"):
            errors.append(f"{pid}: playerDamage mismatch")
    print(json.dumps({"puzzles": len(qs), "source_rows": len(summaries),
                      "counts": dict(tally), "errors": len(errors),
                      "examples": errors[:60]}, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
