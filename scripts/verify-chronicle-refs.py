"""Check that chronicle references point at chapters that actually mention the subject.
Uses the public-domain texts in public/texts (Mahavamsa: Geiger 1912; Dipavamsa: Oldenberg 1879).
For each reference, the subject's name variants are searched for in the cited chapter
(diacritics and case ignored). Misses are reported for human checking; they are not
necessarily errors (spelling variants, OCR damage, epithets)."""
import json, glob, re, unicodedata, sys
def norm(s): return re.sub(r'[^a-z ]', ' ', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower())
texts = {}
for w in ('mahavamsa', 'dipavamsa'):
    for f in glob.glob(f'public/texts/{w}/*.json'):
        d = json.load(open(f))
        body = ' '.join(d.get('paragraphs', [])) + ' ' + ' '.join(v['text'] for v in d.get('verses', []))
        texts[(w, d['chapter'])] = norm(body)
STOP = {'the', 'of', 'and', 'sri', 'king', 'great', 'raja', 'maha', 'vihara', 'temple', 'first', 'second', 'reign', 'term', 'regent', 'interregnum', 'tradition', 'traditional', 'rock', 'stupa', 'thupa', 'island', 'tank', 'wewa', 'ancient', 'sacred', 'relic', 'relics'}
def tokens(name, extra=()):
    words = [w for w in norm(name).split() if len(w) > 3 and w not in STOP] + list(extra)
    out = set()
    for w in words:
        out.add(w)
        # common transliteration variants
        out.add(w.replace('th', 't')); out.add(w[:-1] if w.endswith('a') else w)
        out.add(w.replace('u', 'ii')); out.add(w.replace('u', 'ii')[:-1])  # OCR renders u-macron as 'ii'
        out.add(w.replace('ng', 'mg'))  # Geiger writes samgha for sangha
    return {t for t in out if len(t) > 3}
ALIAS = {'dutthagamani': ['gamani', 'dutthagamani'], 'devanampiya': ['devanampiyatissa', 'devanampiya'], 'ruwanwelisaya': ['mahathupa', 'great thupa'], 'thuparamaya': ['thuparama', 'thupa'],
         'mirisaveti': ['maricavatti'], 'lovamahapaya': ['lohapasada'], 'abhayagiri': ['abhayagiri'], 'jetavanaramaya': ['jetavana'], 'mihintale': ['missaka', 'cetiyapabbata'],
         'kelaniya': ['kalyani'], 'mahiyangana': ['mahiyangana'], 'nagadipa': ['nagadipa'], 'kataragama': ['kajaragama'], 'ritigala': ['arittha'], 'anuradhapura': ['anuradhapura'],
         'isurumuniya': ['issarasamana'], 'vessagiri': ['vessagiri'], 'kirinda': ['ruhuna', 'ship', 'vessel', 'devi'], 'jambukola': ['jambukola'], 'aluvihare': ['book'], 'kotmale': ['kotapabbata', 'kotmale', 'kota'],
         'dighavapi': ['dighavapi'], 'vallipuram': ['vasabha'], 'vedda': ['pulinda'], 'mahiyangana': ['mahiya', 'yakkha'], 'nagadipa': ['nagadipa', 'nagas'], 'attanagalla': ['sanghabodhi'], 'vijitapura': ['vijitapura', 'vijita'], 'dakkhina': ['elara'], 'minneriya': ['manihira'], 'abhaya wewa': ['abhayavapi'],
         'ridi': ['silver'], 'yoda': ['jayaganga'], 'koneswaram': ['gokanna'], 'tissamaharama': ['mahagama'], 'kantale': ['gangatala'], 'panduvasudeva': ['panduvasa'], 'pandukabhaya': ['pakundaka', 'pandukabhaya'], 'sirisanghabodhi': ['sanghabodhi', 'sirisangha'], 'thulatthana': ['thulathana', 'thullatthana'], 'mahaculi': ['culi', 'mahaculika'], 'suratissa': ['suratissa', 'suvannapindatissa', 'pindatissa'], 'ruwanwelisaya story': [], 'great': []}
refs = []
def add(kind, ident, name, rlist):
    for r in rlist or []:
        if r['work'] in ('mahavamsa', 'dipavamsa'): refs.append((kind, ident, name, r))
for f in glob.glob('src/data/events/*.json'):
    for e in json.load(open(f)): add('event', e['id'], e['title'], e.get('chronicle'))
for p in json.load(open('src/data/places.json')):
    add('place', p['id'], p['name'], p.get('chronicle'))
    for s in p.get('stories', []): add('story', p['id'], p['name'] + ' ' + s['title'], s.get('chronicle'))
for r in json.load(open('src/data/rulers.json')): add('ruler', r['id'], r['name'], r.get('chronicle'))
for r in json.load(open('src/data/relics.json')):
    for s in r['stations']: add('relic', r['id'], json.load(open('src/data/places.json')) and s['placeId'] + ' ' + s['note'], s.get('chronicle'))
ok = miss = 0
misses = []
for kind, ident, name, r in refs:
    t = texts.get((r['work'], r['chapter']))
    if t is None: continue
    extra = [a for k, v in ALIAS.items() if k in norm(name) for a in v]
    toks = tokens(name, extra)
    if any(f' {tk}' in t for tk in toks): ok += 1
    else:
        miss += 1; misses.append(f"{kind:6} {ident:38} {r['work']} {r['chapter']:>2}  (searched: {', '.join(sorted(toks))[:80]})")
print(f'chronicle refs checked against text: {ok} confirmed, {miss} not confirmed')
for m in misses: print('  ? ' + m)
json.dump({'confirmed': ok, 'unconfirmed': misses}, open('scripts/verify-chronicle-refs.report.json', 'w'), indent=1)
