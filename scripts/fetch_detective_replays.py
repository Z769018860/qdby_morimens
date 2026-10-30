#!/usr/bin/env python3
"""Download and audit official battle replays for the complete published detective bank.

Usage:
  python scripts/fetch_detective_replays.py --out replay_audit
  python scripts/fetch_detective_replays.py --out replay_audit --workers 3 --timeout 20

Inputs: data/bank/index.json and data/bank/cNNN.json (all 4,101 published puzzles).
Outputs: raw/<UUID>.json, results.jsonl, report.json, failures.json.
Does not fabricate absent data; unknown replay fields are reported as unverified.
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import time
from collections import Counter
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://z1g-warreport.qookkagames.com/publish/BattleReplay_{}.json"
UUID = re.compile(r"^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$")
FIELDS = {
    "keeper": "playerDamage",
    "tentacle": "maxTentacleDamage",
    "counter": "maxCounterAtt",
    "strength": "maxStrength",
    "poison": "maxPosion",
}

def load_bank():
    base = ROOT / "data" / "bank"
    index = json.loads((base / "index.json").read_text(encoding="utf8"))
    result = []
    for i in range((index["n"] + index["chunkSize"] - 1) // index["chunkSize"]):
        path = base / ("c%03d.json" % i)
        group = json.loads(path.read_text(encoding="utf8"))["puzzles"]
        result.extend(group)
    if len(result) != index["n"]:
        raise ValueError("bank count mismatch: %s / %s" % (len(result), index["n"]))
    ids = [str(p["id"]) for p in result]
    if len(set(ids)) != len(ids):
        raise ValueError("duplicate puzzle ID")
    return result

def walk_values(obj, keys, depth=0):
    # Locate matching named statistics, but never assume unrelated numeric values
    # are totals. Ambiguous values are left unverified.
    if depth > 12:
        return
    if isinstance(obj, dict):
        for k, value in obj.items():
            if k in keys and isinstance(value, (int, float)) and not isinstance(value, bool):
                yield (k, value)
            if isinstance(value, (dict, list)):
                yield from walk_values(value, keys, depth + 1)
    elif isinstance(obj, list):
        for value in obj[:10000]:
            if isinstance(value, (dict, list)):
                yield from walk_values(value, keys, depth + 1)

def inspect(puzzle, document):
    observations = {}
    for key, value in walk_values(document, set(FIELDS.values())):
        observations.setdefault(key, set()).add(value)
    checked, mismatches, unavailable = {}, {}, []
    for short, name in FIELDS.items():
        published = (puzzle.get("dmgComp") or {}).get(short)
        distinct = observations.get(name, set())
        if len(distinct) == 1 and published is not None:
            measured = next(iter(distinct))
            if measured == published:
                checked[short] = measured
            else:
                mismatches[short] = {"published": published, "replay": measured}
        else:
            unavailable.append(name if not distinct else name + " (ambiguous or no published value)")
    # Validate UUID if the replay itself explicitly exposes one.
    replay_uuids = []
    def find_uuid(obj, depth=0):
        if depth > 8:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in ("battleUuid", "battleUUID", "uuid") and isinstance(v, str) and UUID.fullmatch(v):
                    replay_uuids.append(v.lower())
                if isinstance(v, (list, dict)): find_uuid(v, depth + 1)
        elif isinstance(obj, list):
            for v in obj[:10000]:
                if isinstance(v, (list, dict)): find_uuid(v, depth + 1)
    find_uuid(document)
    identity = "confirmed" if replay_uuids and all(x == puzzle["uuid"].lower() for x in replay_uuids) else (
        "mismatch" if replay_uuids else "not_present_in_body")
    return {"identity": identity, "verified": checked, "mismatches": mismatches, "unverified": unavailable}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("replay_audit"))
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--timeout", type=float, default=20)
    ap.add_argument("--retries", type=int, default=2)
    args = ap.parse_args()
    if not 1 <= args.workers <= 8:
        ap.error("workers must be 1..8")
    puzzles = load_bank()
    args.out.mkdir(parents=True, exist_ok=True)
    cache = args.out / "raw"
    cache.mkdir(exist_ok=True)
    by_uuid = {}
    failures = []
    for p in puzzles:
        uid = str(p.get("uuid") or "")
        if not UUID.fullmatch(uid):
            failures.append({"id": p["id"], "error": "missing or invalid UUID"})
        else:
            by_uuid.setdefault(uid.lower(), []).append(p)
    def download(pair):
        uid, associated = pair
        dest = cache / (uid + ".json")
        try:
            if dest.exists():
                raw = dest.read_bytes()
                document = json.loads(raw)
                origin = "cache"
            else:
                last = None
                for attempt in range(args.retries + 1):
                    try:
                        req = Request(BASE.format(uid), headers={"User-Agent": "MorimensReplayAudit/1.0", "Accept": "application/json"})
                        with urlopen(req, timeout=args.timeout) as response:
                            raw = response.read(32 * 1024 * 1024 + 1)
                        if len(raw) > 32 * 1024 * 1024:
                            raise ValueError("replay exceeds 32 MiB limit")
                        document = json.loads(raw)
                        if not isinstance(document, (dict, list)):
                            raise ValueError("unexpected JSON root")
                        dest.write_bytes(raw)
                        origin = "network"
                        break
                    except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError, OSError) as err:
                        last = str(err)
                        if attempt < args.retries: time.sleep(0.7 * (attempt + 1))
                else:
                    raise RuntimeError(last)
            return uid, {"status": "downloaded", "origin": origin, "size": len(raw),
                         "sha256": hashlib.sha256(raw).hexdigest(),
                         "puzzles": [{"id": p["id"], **inspect(p, document)} for p in associated]}
        except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as err:
            return uid, {"status": "failed", "error": str(err), "ids": [p["id"] for p in associated]}
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for i, result in enumerate(pool.map(download, by_uuid.items()), 1):
            uid, data = result
            results.append({"uuid": uid, **data})
            if i % 100 == 0:
                print("%d/%d replays" % (i, len(by_uuid)), flush=True)
    with (args.out / "results.jsonl").open("w", encoding="utf8") as fp:
        for row in results:
            fp.write(json.dumps(row, ensure_ascii=False) + "\n")
    problems = failures + [r for r in results if r["status"] != "downloaded"]
    (args.out / "failures.json").write_text(json.dumps(problems, ensure_ascii=False, indent=2), encoding="utf8")
    status = Counter(r["status"] for r in results)
    identities = Counter(p["identity"] for r in results if r["status"] == "downloaded" for p in r["puzzles"])
    mismatches = sum(len(p["mismatches"]) for r in results if r["status"] == "downloaded" for p in r["puzzles"])
    verified = sum(len(p["verified"]) for r in results if r["status"] == "downloaded" for p in r["puzzles"])
    report = {"puzzles": len(puzzles), "unique_valid_uuids": len(by_uuid),
              "invalid_uuid_puzzles": len(failures), "downloads": dict(status),
              "identity": dict(identities), "verified_field_pairs": verified,
              "field_mismatches": mismatches, "failure_count": len(problems),
              "note": "Unmatched fields are not inferred. A JSON download is not proof that every replay metric was independently verified."}
    (args.out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if problems or mismatches or identities.get("mismatch"):
        raise SystemExit(1)

if __name__ == "__main__":
    main()
