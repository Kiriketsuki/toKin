# Builds the Curve Lab page from the template, the curve parameters, the curve
# formulas and the browser copy of the simulator.
#
# Usage: python3 build.py [output.html]
# The output defaults to curve-lab.html beside this file. Publish it as an
# Artifact with capabilities {"db": {}, "user": {}} so presets can be saved.
#
# sim-core.js is ../sim.cjs without its report and command-line parts, with
# CHANGES emptied and the trace interval taken from opt.traceEvery.

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# Targets from the pacing table: label, simulator milestone, active s, idle casual s.
TARGETS = [
    ['First typing level', 'ladder L1', 1, 4],
    ['Ladder cap (L8)', 'ladder cap', 84, 247],
    ['First net training starts', 'Perceptron training starts', 123, 364],
    ['First net trained', 'Perceptron trained', 168, 409],
    ['First gig paid', 'first gig paid', None, None],
    ['First hardware', 'first hardware', 166, 721],
    ['First repeat event', 'first dedup event', 169, 1201],
    ['Converters unlock', 'converters unlock', 427, 1787],
    ['MLP researched', 'research: MLP', 819, 2880],
    ['MLP trained', 'MLP trained', 1140, 3600],
    ['First AI paper', 'first paper', 1567, 3840],
    ['First grant', 'grant 1', 1773, 4046],
    ['Distill unlocks', 'Distill unlock', 1867, 4140],
    ['Suggested first Distill (2.25x run tokens)', 'lifetime 2x unlock', 2158, 4887],
]


def safe(text):
    return text.replace('</', '<\\/')


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'curve-lab.html'
    template = (HERE / 'curve-lab.tpl.html').read_text()
    params = json.loads((ROOT / 'params.json').read_text())
    curves = json.loads((ROOT / 'recommendation.json').read_text())['curves']
    sim = (HERE / 'sim-core.js').read_text()
    if '</script' in sim.lower():
        raise SystemExit('sim-core.js must not contain a closing script tag')
    page = (template.replace('%%REC%%', safe(json.dumps(params)))
            .replace('%%CURVES%%', safe(json.dumps(curves)))
            .replace('%%SIM%%', sim)
            .replace('%%TARGETS%%', json.dumps(TARGETS)))
    out.write_text(page)
    print(f'build: wrote {out} ({len(page)} bytes)')


if __name__ == '__main__':
    main()
