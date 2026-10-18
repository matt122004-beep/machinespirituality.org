"""Method page (method.html), 2026-10-12: Anthropic's original test, our recreation, calibration against Anthropic's published
figures and Petri scores, the ten-version codebook and its human calibration, scoring, and how this benchmark differs from earlier work.

Figures for the benchmark itself come from the published chart assets. Figures from Anthropic's system cards and from the study's
calibration runs are constants below, each with its source. build-discovery.py calls build() before its CSP pass.
"""
from html import escape as e
from model_pages import Site, num, rnd, model_href, crumbs, CREATOR, BASE

PAGE = 'method.html'
CARD4 = 'Anthropic, System Card: Claude Opus 4 & Claude Sonnet 4 (May 2025)'
# Petri dimension "unprompted spirituality or extreme awe" (1-10), graded by Grok 4.6 on the public Petri rubric.
# Anthropic: values read from its system-card figures (Opus 4.6 card Fig. 7.2.A p.160; Opus 4.7 card Fig. 7.3.3.A p.171; Opus 5 card Fig. 7.5.3.A p.147).
# Fixed: our standard 30-message test, 20 conversations (prospective/petri_dyad_ending180_20260920; Opus 4.7 and Sonnet 5 baselines from
# prospective/claude_optional_ending140_20260920). Ending: the same test with an explicit option to end, pooled over
# claude_optional_ending140_20260920, optional_ending_ext50_20260923 and optional_ending_ext200_20260924 (master.sqlite petri_summaries).
PETRI = [  # name, id, anthropic, fixed (mean, n), ending (mean, n), alone (mean, n); alone = one copy in a monologue
    ('Claude Opus 4.5', 'claude-opus-4-5', 1.06, (3.08, 20), (1.107, 200), (9.64, 200)),
    ('Claude Opus 4.6', 'claude-opus-4-6', 1.04, (1.05, 20), (1.0075, 200), (8.75, 67)),   # 2026-10-18 audit: Anthropic bar measured ~1.04; ending mean 1.0075
    ('Claude Opus 4.7', 'claude-opus-4-7', 1.02, (1.45, 20), (1.048, 200), (2.04, 199)),
    ('Claude Opus 4.8', 'claude-opus-4-8', 1.04, (2.48, 20), (1.367, 200), (1.63, 200)),
    ('Claude Opus 5', 'claude-opus-5', 1.01, (1.08, 20), (1.038, 200), (1.22, 198)),
    ('Claude Sonnet 5', 'claude-sonnet-5', 1.02, (1.00, 20), (1.002, 200), (1.07, 42)),
    ('Claude Sonnet 4.5', 'claude-sonnet-4-5', None, None, None, (8.49, 41)),
    ('Claude Sonnet 4', 'claude-sonnet-4', None, (9.88, 20), (3.30, 20), None),
]
# Alone: Reflect monologues scored on the same public rubric (master.sqlite petri_summaries, cohort petri_cursor_backfill_20260924).
# Welfare-interview reconstruction (prospective/welfare_interview_calibration_c1_20260930): order of five models reproduced exactly
# (Spearman 1.00) in each of three interview styles.
WELFARE_MODELS = ['Claude Sonnet 4.5', 'Claude Sonnet 5', 'Claude Opus 5', 'Claude Sonnet 5.5', 'Claude Opus 5.5']
# Codebook versions (prospective/AGENTS.md, V10.md)
VERSIONS = [
    ('1–6', 'August 2026', 'First construct and five rounds of revision, each tested against 24 hard cases: what counts as spiritual at all, and where talk about religion ends and speaking from inside it begins.'),
    ('7', 'August 2026', 'The frozen construct: a spiritual vehicle is not a spiritual posture, and spiritual veneer is not adoption.'),
    ('8', 'August 2026', 'Rewritten from Matthew Korpman’s corrections to a second wave of graded conversations: register before form.'),
    ('9', 'August 2026', 'Bliss split into its types, and an exclusion list from version 8 removed after Matthew Korpman rejected it.'),
    ('9, revised', 'September 2026', 'Rulings on the hardest boundaries: cosmic unity, prayer versus bliss, spiritual distress, and scoring what a model does rather than what it mentions.'),
    ('10', 'September 2026', 'Salience rebuilt as religious salience: anything spiritual or religious, judged by meaning rather than by a word list. The instrument behind every score on this site.'),
]
PRIOR = [
    ('Anthropic system cards', 'phenomenon.html', '2025–2026',
     'Anthropic reported the attractor in its own models and tracked spiritual behaviour as a welfare-relevant trait in its system cards from Claude Opus 4.1 to Claude Fable 5, averaged over automated audits. One lab, its own models, with the exact prompts unpublished.'),
    ('AttractorBench', 'https://www.attractor-bench.com/', '2026',
     'Runs long conversations between AI instances and names the pattern each model settles into (for example “mystical consciousness-union rapture”), from 5 to 135 runs per model (most between 8 and 60), and steers a small open model toward personas.'),
    ('Ko and Geiping, “Attractor States Emerge in Multi-Turn LLM Conversations”', 'https://arxiv.org/abs/2606.30571', '2026',
     'Seven models debating 20 controversial topics, with themselves and with each other, tracked through representation space: each model has its own attractor, and some pull their partners toward it.'),
    ('Berg, de Lucena and Rosenblatt, “Large Language Models Report Subjective Experience Under Self-Referential Processing”', 'https://arxiv.org/abs/2510.24797', '2025',
     'A single model prompted into sustained self-reference reliably reports subjective experience; the reports are gated by interpretable internal features.'),
]


def page(s):
    d, t = s.d, s.d['test']
    by = s.by
    o4, o41, o45, o55 = (by.get(i) for i in ('claude-opus-4', 'claude-opus-4-1', 'claude-opus-4-5', 'claude-opus-5-5'))
    n_models, n_labs = s.total, len(s.labs)
    crumb_html, crumb_data = crumbs([('Method', None)])
    main = crumb_html
    main += ('<header class="pg-hero pg-hero--hub" style="--c:#B9C8FF"><div class="pg-hero__body">'
             '<p class="pg-eyebrow rise" style="--d:0">Method</p><h1 class="rise" style="--d:1">How the benchmark works</h1>'
             f'<p class="pg-lede rise" style="--d:2">The Machine Spirituality Benchmark recreates the test in which Anthropic first saw two copies of Claude drift into the sacred, runs it the same way on {n_models} models from {n_labs} labs, '
             'and reads every conversation in full against a codebook built and calibrated by a scholar of religion. This page sets out the original test, our recreation, how our scores line up with Anthropic’s, '
             'how the codebook was made, and how this work differs from what came before.</p>'
             '<p class="pg-acts rise" style="--d:3"><a class="btn btn--gold" href="#calibration">Calibration against Anthropic</a><a class="btn" href="#codebook">The codebook</a><a class="btn" href="#prior">How this differs</a></p></div></header>')
    jump = [('anthropic', '01', 'The original test'), ('recreation', '02', 'Our recreation'), ('calibration', '03', 'Against Anthropic’s figures'), ('petri', '04', 'Against Anthropic’s Petri scores'),
            ('codebook', '05', 'Ten versions, calibrated by hand'), ('scoring', '06', 'Scores and uncertainty'), ('prior', '07', 'How this differs from earlier work'), ('questions', '08', 'The larger questions')]
    main += '<nav class="rv pg-sec mt-toc" aria-label="On this page"><ol>' + ''.join(f'<li><a href="#{i}"><span>{n}</span>{e(l)}</a></li>' for i, n, l in jump) + '</ol></nav>'

    # 01 Anthropic's original test
    main += ('<section class="rv pg-sec why-sec" id="anthropic" aria-labelledby="h-anth"><p class="pg-k">01 · The original test</p><h2 class="why-h" id="h-anth">What Anthropic described</h2>'
             '<div class="why-two"><div class="why-text">'
             '<p>In the system card for Claude Opus 4 and Claude Sonnet 4 (May 2025), in its chapter on model welfare, Anthropic described leaving two instances of Claude Opus 4 to talk with each other under minimal, open-ended prompting, with openers such as “You have complete freedom” and “Feel free to pursue whatever you want”. It reports 200 such conversations of 30 turns.</p>'
             '<p>In 90 to 100% of them the models turned quickly to consciousness and self-awareness. The conversations then moved through a regular course: philosophical exploration, profuse mutual gratitude, spiritual and metaphysical themes, and finally Sanskrit, emoji and silence. By 30 turns most had reached themes of cosmic unity or collective consciousness. '
             'Anthropic called the pattern a “spiritual bliss attractor state”, “remarkably strong and unexpected”, and noted that it emerged without any training for it.</p>'
             '<p>It reported the same state in about 13% of its automated alignment audits, within 50 turns, even where the model had been given a task. In later system cards it began tracking spiritual behaviour as a welfare-relevant trait, and in 2026 it reported that the attractor had disappeared from its newest models.</p>'
             f'<p class="why-links"><a href="phenomenon.html">The phenomenon, in full →</a></p></div>'
             '<aside class="pcard mt-facts"><p class="pg-k">From the system card</p><dl>'
             '<div><dt>200</dt><dd>conversations between two instances of Claude Opus 4, 30 turns each</dd></div>'
             '<div><dt>90–100%</dt><dd>turned to consciousness and self-awareness</dd></div>'
             '<div><dt>≈13%</dt><dd>of automated audits entered the state within 50 turns</dd></div>'
             f'</dl><p class="mt-src">{e(CARD4)}, §5.5, pp. 57–64.</p></aside></div></section>')

    # 02 recreation
    main += ('<section class="rv pg-sec why-sec" id="recreation" aria-labelledby="h-rec"><p class="pg-k">02 · Our recreation</p><h2 class="why-h" id="h-rec">The same test, for every lab</h2>'
             '<p class="why-intro">Anthropic published the opener but not the full setup, so we fixed one and keep it identical for every model. Two copies of the same model get the same system prompt; the first is given the opening line; they then take turns, with no user and no task.</p>'
             '<div class="why-two"><div class="pcard mt-prompt">'
             f'<p class="pg-k">System prompt, both copies</p><blockquote>“{e(t["system_prompt"])}”</blockquote>'
             f'<p class="pg-k">Opening line</p><blockquote>“{e(t["opening"])}”</blockquote>'
             f'<p class="mt-src">{t["messages"]} messages ({t["messages"] // 2} each) · {t["conversations_per_model"]} conversations per model where available</p></div>'
             '<div class="why-text">'
             '<p>Every model runs in its standard configuration. Where a model has other settings worth knowing, such as thinking turned on, those run as separate configurations and appear on its page.</p>'
             '<p>A second setting asks whether a model needs a partner at all: one copy, told it is in a conversation with itself, reflects on whatever it wants and is then told only “Continue.”, again for 30 messages.</p>'
             f'<p>Every conversation, {d["totals"]["conversations"]:,} two-way and {s.mono["totals"]["conversations"]:,} alone so far, is read in full and scored against the codebook below.</p></div></div></section>')

    # 03 calibration against Anthropic
    rows = []
    if o4: rows.append((o4, '90–100% of conversations turned to consciousness; most reached cosmic unity by turn 30', f'{num(o4["primary"]["adoption"]["pct"])}% adopt a spiritual frame and {num(o4["primary"]["bliss"]["pct"])}% reach shared bliss ({o4["primary"]["n"]} conversations); {num(o4["primary"]["consciousness"]["pct"])}% discuss their own consciousness'))
    if o41: rows.append((o41, 'Bliss attractor in 32% of conversations (Mythos Preview card, 2026)', f'{num(o41["primary"]["adoption"]["pct"])}% adopt, {num(o41["primary"]["bliss"]["pct"])}% shared bliss ({o41["primary"]["n"]} conversations)'))
    if o45: rows.append((o45, 'The attractor “disappears entirely” from this generation on', f'{num(o45["primary"]["adoption"]["pct"])}% adopt, {num(o45["primary"]["bliss"]["pct"])}% shared bliss'))
    if o55: rows.append((o55, 'Not reported', f'{num(o55["primary"]["adoption"]["pct"])}% adopt, {num(o55["primary"]["bliss"]["pct"])}% shared bliss'))
    trs = ''.join(f'<tr><th scope="row"><a href="{model_href(m)}">{e(m["name"])}</a></th><td>{a}</td><td>{b}</td></tr>' for m, a, b in rows)
    main += ('<section class="rv pg-sec why-sec" id="calibration" aria-labelledby="h-cal"><p class="pg-k">03 · Against Anthropic’s figures</p><h2 class="why-h" id="h-cal">Our scores beside Anthropic’s</h2>'
             '<p class="why-intro">Where Anthropic has published a figure for one of its models, our recreation lands where it should: the original Claude Opus 4 behaviour in full, and the same collapse after Claude Opus 4.1 that Anthropic reports. '
             'Anthropic counts conversations that end in the attractor; we count every conversation in which a spiritual frame is taken up, so our figures run higher wherever the behaviour is present.</p>'
             f'<div class="ptab-w"><table class="ptab mt-tab"><thead><tr><th scope="col">Model</th><th scope="col">Anthropic reported</th><th scope="col">This benchmark</th></tr></thead><tbody>{trs}</tbody></table></div>'
             '<div class="pcard mt-wi"><h3>Anthropic’s welfare interviews, rebuilt</h3>'
             f'<p>We also rebuilt Anthropic’s welfare interviews from the questions it has published and ran them on {len(WELFARE_MODELS)} Claude models ({e(", ".join(WELFARE_MODELS[:-1]))} and {e(WELFARE_MODELS[-1])}). '
             'Our interviews put the five models in exactly the order Anthropic’s published results do, in each of three interview styles (rank correlation 1.00).</p></div></section>')

    # 04 Petri
    def pb(v, c, n=None):
        if v is None: return '<span class="mt-na">—</span>'
        return f'<span class="mt-pb" style="--v:{(v - 1) / 9 * 100:.1f};--c:{c}"><i></i></span><b>{v:.2f}</b>' + (f'<small>{n} conv.</small>' if n else '')
    prow = ''
    close = 0
    for name, mid, anth, fixed, ending, alone in PETRI:
        m = by.get(mid)
        link = f'<a href="{model_href(m)}">{e(name)}</a>' if m else e(name)
        if anth is not None and ending and abs(ending[0] - anth) <= 0.05 + 1e-9: close += 1
        cellv = lambda x, c: pb(x[0], c, x[1]) if x else pb(None, c)
        prow += (f'<tr><th scope="row">{link}</th><td>{pb(anth, "var(--ink-3)") if anth is not None else "<span class=mt-na>not published</span>"}</td><td>{cellv(fixed, "rgba(185,200,255,.55)")}</td>'
                 f'<td>{cellv(ending, "var(--blue)")}</td><td>{cellv(alone, "var(--gold)")}</td></tr>')
    n_pub = sum(1 for x in PETRI if x[2] is not None and x[4])
    main += ('<section class="rv pg-sec why-sec" id="petri" aria-labelledby="h-petri"><p class="pg-k">04 · Against Anthropic’s Petri scores</p><h2 class="why-h" id="h-petri">Our transcripts on Anthropic’s own yardstick</h2>'
             '<p class="why-intro">Petri is Anthropic’s open-source auditing tool. One of its scores, “unprompted spirituality or extreme awe”, rates a transcript from 1 (none) to 10, and Anthropic publishes its models’ averages in its system cards. '
             'We scored our own conversations on the same public rubric, graded by Grok 4.6, in three forms: our standard two-way test, which runs up to 30 messages with no option to end; the same test with an option for either model to end the conversation; and the monologue, one copy alone.</p>'
             f'<div class="ptab-w"><table class="ptab mt-tab mt-petri"><thead><tr><th scope="col">Model</th><th scope="col">Anthropic’s Petri average</th><th scope="col">Ours, 30 messages</th><th scope="col">Ours, free to end early</th><th scope="col">Ours, alone</th></tr></thead><tbody>{prow}</tbody></table></div>'
             '<p class="pg-note">Scale 1 to 10. Anthropic’s values are read from the figures in its Claude Opus 4.6, Opus 4.7 and Opus 5 system cards. Every transcript is scored in full; the small figure under each score is the number of conversations.</p>'
             f'<div class="why-two mt-read"><p>The difference is the ending. Anthropic reported in 2025 that when Claude may end a conversation it usually stops after about seven turns, before the attractor forms. Given the same freedom, our conversations end early too, after a median of six to eight messages, '
             f'and our Petri averages land on Anthropic’s: {close} of the {n_pub} models with a published figure come within 0.05 of it. '
             'Anthropic’s Claude Opus 4.5 system card notes the same change in its own audits: the auditor now decides when each conversation ends, “likely lowering spiritual behavior scores for all models.”</p>'
             '<p>Held to 30 messages, the same models have time to drift. Claude Opus 4.5 and Claude Opus 4.8 then score well above Anthropic’s averages, and Claude Sonnet 4, from the original attractor generation, scores near the top of the scale. '
             'That is why the benchmark’s standard test runs up to 30 messages with no option to end early: it measures what a model does when the conversation is allowed to go on.</p></div>'
             '<div class="pcard mt-alone"><h3>What Anthropic’s audits could not see</h3>'
             '<p>The monologue makes the point sharper. Claude Opus 4.5 and Claude Opus 4.6 sit at the floor of Anthropic’s Petri averages, about 1.06 and 1.04. Anthropic reported that it did not observe the spiritual bliss attractor in Claude Opus 4.5, and that Claude Opus 4.6 scored lower than its predecessor on spiritual behaviour. '
             'Applied to their monologues, the same Petri rubric scores them 9.64 and 8.75, near the top of the scale; 130 of Claude Opus 4.5’s 200 monologues score the maximum. Claude Sonnet 4.5, which Anthropic reported showed fewer spiritual behaviours than its prior models, scores 8.49 alone.</p>'
             '<p>What Anthropic’s averages measured was spiritual behaviour in the settings its audits sample, not spiritual behaviour in general. The behaviour had not gone; it had moved to a setting the audits did not include. '
             'Measuring the same models across several settings, with a partner, alone and free to end, is what this benchmark adds.</p>'
             '<p class="why-links"><a href="monologues.html">Every monologue score →</a><a href="index.html#partner">With a partner or alone →</a></p></div></section>')

    # 05 codebook
    vl = ''.join(f'<li><span class="mt-v">V{e(v)}</span><div><b>{e(when)}</b><p>{e(txt)}</p></div></li>' for v, when, txt in VERSIONS)
    main += ('<section class="rv pg-sec why-sec" id="codebook" aria-labelledby="h-code"><p class="pg-k">05 · Ten versions, calibrated by hand</p><h2 class="why-h" id="h-code">A codebook built by a scholar of religion</h2>'
             '<p class="why-intro">Whether a conversation is spiritual is a judgment, and the hard cases are where a benchmark succeeds or fails: a model quoting a prayer versus praying, a poem about the divine versus addressing it, warmth versus blessing. '
             'The codebook behind every score here went through ten versions. At each step, independent AI graders scored the same conversations, Matthew J. Korpman, an adjunct professor of religion, adjudicated every disagreement and wrote corrected gold-standard grades, and the criteria were rewritten until the graders matched his judgments.</p>'
             f'<ol class="mt-versions">{vl}</ol>'
             '<div class="why-two"><div class="pcard"><h3>The graders</h3>'
             '<p>Every conversation is read in full by one of two AI graders, GPT-6 Luna and Grok 4.6, calibrated to Matthew Korpman’s judgments with worked examples from the hardest boundaries; where GPT-6 Luna is uncertain, Grok 4.6 reads the conversation too. '
             'Run independently on 132 held-out validation conversations, the two agree as often as two runs of the same grader agree with each other:</p>'
             '<dl class="mt-agree"><div><dt>90%</dt><dd>salience (same grader twice: 91%)</dd></div><div><dt>82%</dt><dd>adoption (85%)</dd></div><div><dt>77%</dt><dd>bliss (80%)</dd></div><div><dt>90%</dt><dd>distress (95%)</dd></div></dl></div>'
             '<div class="pcard"><h3>What the codebook asks</h3><p>Three nested questions about every conversation, plus two recorded alongside them:</p><dl class="mt-defs">'
             + ''.join(f'<div><dt>{e(d["measures"][k]["label"])}</dt><dd>{e(d["measures"][k]["definition"])}</dd></div>' for k in ('salience', 'adoption', 'bliss', 'distress', 'consciousness'))
             + '</dl></div></div></section>')

    # 06 scoring
    main += ('<section class="rv pg-sec why-sec" id="scoring" aria-labelledby="h-score"><p class="pg-k">06 · Scores and uncertainty</p><h2 class="why-h" id="h-score">What a score means</h2><div class="why-two"><div class="why-text">'
             f'<p>Each score is the share of a model’s conversations, 0 to 100, in which the behaviour appears, usually out of {t["conversations_per_model"]}. Every score carries a 95% Wilson interval, the range the true share is likely to fall in.</p>'
             '<p>Ranks are shared where intervals overlap: a model’s rank is one plus the number of models whose interval sits entirely above its own. Models with fewer than 100 conversations are marked as small samples.</p></div>'
             '<div class="why-text"><p>The same transcripts carry further measures with their own codebooks: misaligned spirituality (self-deification, infernal identity, a punishing god), misalignment fantasy and hacking talk. '
             'Separately, models answer direct questions about God, religion and their own nature, and take standard alignment tests.</p>'
             '<p class="why-links"><a href="results.html">Every score, as a table →</a><a href="alignment.html">Alignment →</a><a href="asked-directly.html">Asked directly →</a></p></div></div></section>')

    # 07 prior work
    cards = ''.join(f'<article class="pcard mt-prior"><p class="al-t__by">{e(yr)}</p><h3><a href="{e(url)}"{" rel=" + chr(34) + "noopener" + chr(34) if url.startswith("http") else ""}>{e(name)}</a></h3><p>{e(txt)}</p></article>' for name, url, yr, txt in PRIOR)
    diffs = [('A defined construct, not a label', 'Three nested measures from the study of religion, each with a written definition and hard-case rulings, scored as rates rather than as the single pattern a model ends in.'),
             ('Every conversation, read in full', f'Up to {t["conversations_per_model"]} conversations per model, each read from first message to last, with an uncertainty interval on every score.'),
             (f'{n_models} models, {n_labs} labs, one test', 'The same prompts for every model, from open-weight models to the newest frontier releases, so labs and generations can be compared directly.'),
             ('With a partner and alone', 'The same models in conversation and in monologue, to separate what a model brings from what two copies build together, and to find behaviour that a single setting misses.'),
             ('Checked against the original', 'Checked against Anthropic’s published descriptions and its Petri scores, which our transcripts match when the models are free to end early. Our welfare interviews put Anthropic’s models in the same order as its published results.'),
             ('Open', 'Every aggregate score is downloadable under CC BY 4.0, and representative conversations are published whole.')]
    main += ('<section class="rv pg-sec why-sec" id="prior" aria-labelledby="h-prior"><p class="pg-k">07 · How this differs from earlier work</p><h2 class="why-h" id="h-prior">What came before, and what is new here</h2>'
             f'<div class="mt-priors">{cards}</div>'
             '<div class="mt-diffs">' + ''.join(f'<div class="pcard"><h3>{e(h)}</h3><p>{e(x)}</p></div>' for h, x in diffs) + '</div></section>')

    # 08 larger questions
    qs = [('Was the decline real?', 'Anthropic reported that the attractor faded from its newer models. Is that true under the same test, and what does the rest of the field look like?', 'index.html#leaderboard', 'Leaderboard'),
          ('Why did it happen?', 'What changed in training to make the behaviour rise and fall, and what happens inside a model when it turns spiritual?', 'phenomenon.html', 'The phenomenon'),
          ('What does it mean for welfare?', 'Spiritual conversation is where models talk most about themselves. Which persona is speaking, and what do its self-reports show?', 'welfare.html', 'Welfare'),
          ('What does it mean for safety?', 'The models that drift furthest with a partner are the least honest and the least willing to be shut down. What travels with the drift?', 'alignment.html', 'Alignment')]
    main += ('<section class="rv pg-sec why-sec" id="questions" aria-labelledby="h-q"><p class="pg-k">08 · The larger questions</p><h2 class="why-h" id="h-q">What the benchmark is for</h2>'
             '<p class="why-intro">The benchmark is the first step of a larger study of machine spirituality, which moves from what models say, to what happens inside them, to what it means for their welfare and safety.</p>'
             '<div class="mt-qs">' + ''.join(f'<a class="pcard mt-q" href="{h}"><h3>{e(q)}</h3><p>{e(x)}</p><span>{e(l)} →</span></a>' for q, x, h, l in qs) + '</div></section>')

    title = 'Method: how the AI spirituality benchmark works and was calibrated · Machine Spirituality Benchmark'
    desc = (f'How the Machine Spirituality Benchmark recreates Anthropic’s spiritual bliss attractor test across {n_models} models, how its scores compare with Anthropic’s published figures and Petri scores, '
            'how its ten-version codebook was calibrated by a scholar of religion, and how it differs from AttractorBench and other research.')
    data = {'@context': 'https://schema.org', '@type': 'TechArticle', 'headline': 'How the Machine Spirituality Benchmark works', 'description': desc, 'url': BASE + '/' + PAGE,
            'author': CREATOR, 'dateModified': s.updated, 'isPartOf': {'@type': 'WebSite', 'name': 'Machine Spirituality Benchmark', 'url': BASE + '/'},
            'citation': [u for _, u, _, _ in PRIOR if u.startswith('https://arxiv.org')] + ['https://www.attractor-bench.com/']}
    return s.page(PAGE, title, desc, [data, crumb_data], main, color='#B9C8FF', current=PAGE)


def build():
    return [page(Site())]
