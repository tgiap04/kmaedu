"""AI-04: the production image must not carry the offline evaluation harness or its CSV data."""

import re
from pathlib import Path

DOCKERFILE = Path(__file__).resolve().parents[3] / "Dockerfile"
EXCLUDED = ("src/evaluation", "src/evaluation_result.csv", "src/test_dataset.csv")


def _stages() -> list[str]:
    return re.split(r"^FROM ", DOCKERFILE.read_text(encoding="utf-8"), flags=re.M)[1:]


def test_runtime_stage_never_copies_the_raw_source_tree():
    runtime = _stages()[-1]
    assert not re.search(r"^COPY\s+(?!--from)\S*apps/ai-service/src\b", runtime, re.M)


def test_the_source_tree_reaches_the_image_only_through_a_pruning_stage():
    pruning = [s for s in _stages() if re.search(r"^COPY\s+apps/ai-service/src\b", s, re.M)]
    assert len(pruning) == 1
    removed = " ".join(line for line in pruning[0].splitlines() if "rm " in line)
    assert all(path.removeprefix("src/") in removed for path in EXCLUDED)
    assert "COPY --from=" in _stages()[-1] and "/app/src" in _stages()[-1]


def test_the_excluded_paths_are_not_imported_by_the_runtime_code():
    root = Path(__file__).resolve().parents[2]
    offenders = [
        str(p.relative_to(root))
        for p in root.rglob("*.py")
        if "evaluation" not in p.relative_to(root).parts[:1] and "tests" not in p.parts
        and re.search(r"^\s*(from|import)\s+src\.evaluation\b", p.read_text(encoding="utf-8"), re.M)
    ]
    assert offenders == []
