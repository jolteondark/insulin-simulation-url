#!/usr/bin/env python3
import argparse, hashlib, json
from pathlib import Path


def git_blob_sha1(path: Path) -> str:
    data = path.read_bytes()
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode())
    h.update(data)
    return h.hexdigest()


def verify(csv_dir: Path, manifest_path: Path):
    m = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected = {x["path"]: x for x in m["files"]}
    actual_files = sorted(p.name for p in csv_dir.glob("*.csv"))
    missing = sorted(set(expected) - set(actual_files))
    unexpected = sorted(set(actual_files) - set(expected))
    mismatches = []
    verified = []
    for name, spec in sorted(expected.items()):
        p = csv_dir / name
        if not p.exists():
            continue
        size = p.stat().st_size
        sha = git_blob_sha1(p)
        problems = []
        if size != spec["bytes"]:
            problems.append({"field":"bytes","expected":spec["bytes"],"actual":size})
        if sha != spec["git_blob_sha1"]:
            problems.append({"field":"git_blob_sha1","expected":spec["git_blob_sha1"],"actual":sha})
        if problems:
            mismatches.append({"path":name,"problems":problems})
        else:
            verified.append(name)
    total_bytes = sum((csv_dir / n).stat().st_size for n in actual_files if (csv_dir / n).is_file())
    return {
        "ok": not missing and not unexpected and not mismatches,
        "manifest_tree_sha": m.get("source_tree_sha"),
        "expected_file_count": m["participant_file_count"],
        "actual_file_count": len(actual_files),
        "expected_total_bytes": m["participant_total_bytes"],
        "actual_total_bytes": total_bytes,
        "verified_count": len(verified),
        "missing": missing,
        "unexpected": unexpected,
        "mismatches": mismatches,
    }


def main():
    ap = argparse.ArgumentParser(description="Verify local AZT1D participant CSVs against the pinned Glucose-ML Git object manifest.")
    ap.add_argument("--csv-dir", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--output")
    a = ap.parse_args()
    out = verify(Path(a.csv_dir), Path(a.manifest))
    text = json.dumps(out, indent=2)
    print(text)
    if a.output:
        Path(a.output).write_text(text + "\n", encoding="utf-8")
    raise SystemExit(0 if out["ok"] else 2)

if __name__ == "__main__":
    main()
