"""Lab flagships by rule (2026-10-20, Matthew: "charts on the home page and elsewhere don't update when you add new models").

Each lab in labs.js has a "line": a pattern for its top-tier model line (e.g. Anthropic ^Claude Opus, Google ^Gemini).
The flagship is the newest release in data/twoway_v10.js whose name matches the line (ties: name). build-discovery.py calls
refresh() first, so the homepage summary charts, compare defaults, lab pages and pre-rendered HTML pick up a new flagship
automatically; check-discovery.py calls compute() and fails if labs.js is stale. Change a lab's flagship by editing its line.
"""
import json, re
from pathlib import Path


def _labs_text(root):
    return (Path(root) / 'labs.js').read_text()


def _split(text):
    i = text.index('window.MSB_LABS')
    return text[:i], json.loads(text[text.index('{', i):text.rindex('}') + 1])


def _models(root):
    s = (Path(root) / 'data/twoway_v10.js').read_text()
    return json.loads(s[s.index('{'):s.rfind('}') + 1])['models']


def compute(root='.'):
    """{lab: flagship name} from each lab's line and the published two-way data."""
    _, labs = _split(_labs_text(root))
    models = _models(root)
    out = {}
    for lab, info in labs.items():
        line = info.get('line')
        if not line:
            out[lab] = info.get('flagship')
            continue
        pool = [m for m in models if m['lab'] == lab and m.get('released') and re.search(line, m['name'])]
        out[lab] = max(pool, key=lambda m: (m['released'], m['name']))['name'] if pool else info.get('flagship')
    return out


def refresh(root='.'):
    """Rewrite labs.js flagships from the rule; returns [(lab, old, new)] for every change."""
    text = _labs_text(root)
    head, labs = _split(text)
    new = compute(root)
    changes = [(lab, labs[lab].get('flagship'), new[lab]) for lab in labs if labs[lab].get('flagship') != new[lab]]
    if changes:
        for lab, _, name in changes:
            labs[lab]['flagship'] = name
        (Path(root) / 'labs.js').write_text(head + 'window.MSB_LABS = ' + json.dumps(labs, indent=1, ensure_ascii=False) + ';\n')
    return changes
