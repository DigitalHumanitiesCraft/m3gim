"""Vocabulary coverage as a binding test gate.

Runs `vocab/check-coverage.py` and fails as soon as the checker reports a
deviation. This checks the coverage of the formal vocabulary against the
generated dataset in the standard run, instead of only being available as a
manual command.

Wired in as a separate process, for three reasons. The script exports no
callable check function; `main()` assembles its finding internally and emits it
via console and exit code. The filename carries a hyphen and is therefore not an
importable module name. And the manual command from `CLAUDE.md` and this gate
thus run through the same entry point, so they cannot diverge. The script's full
output goes into the assertion, so a red run names the missing term.

Path overrides: `--data` follows the conftest fixture (`M3GIM_JSONLD_PATH`),
`--vocab` follows `M3GIM_VOCAB_PATH`.
"""

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
CHECKER = REPO_ROOT / "vocab" / "check-coverage.py"
VOCAB_PATH = Path(os.environ.get("M3GIM_VOCAB_PATH", REPO_ROOT / "vocab" / "m3gim.ttl"))


def test_vocab_coverage_gate(jsonld_path):
    """Every m3gim term used in the dataset is defined in the vocabulary."""
    assert CHECKER.exists(), f"Abdeckungspruefer fehlt: {CHECKER}"

    result = subprocess.run(
        [
            sys.executable,
            str(CHECKER),
            "--vocab", str(VOCAB_PATH),
            "--data", str(jsonld_path),
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    report = f"{result.stdout}{result.stderr}".strip()

    # Guards against a silent no-op: the checker must have parsed the vocabulary.
    assert "OK Vokabular geparst" in result.stdout, (
        f"check-coverage.py hat das Vokabular nicht geparst:\n{report}"
    )
    assert result.returncode == 0, (
        f"check-coverage.py meldet Abweichungen (Exit {result.returncode}):\n{report}"
    )
