"""Cross-check place coordinates against Wikidata and import further heritage sites.

  python3 -I scripts/wikidata-sync.py check     # report distances, write scripts/wikidata-report.json
  python3 -I scripts/wikidata-sync.py apply     # also update coordinates/images and import new sites

Matching uses each place's English Wikipedia title (`wiki`). Coordinates are updated when the
Wikidata point is 40 m - 25 km away (larger gaps usually mean a mismatched article and are only reported).
Imported sites carry importedFrom='wikidata' and the Wikidata QID; they have no stories until curated."""
import json, math, sys, time, urllib.parse, urllib.request
MODE = sys.argv[1] if len(sys.argv) > 1 else 'check'
UA = 'LankaThroughTime-atlas/0.1 (historical atlas data validation)'
def sparql(q):
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q, 'format': 'json'})
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json'})
    for attempt in range(5):
        try:
            return json.load(urllib.request.urlopen(req, timeout=90))['results']['bindings']
        except Exception as e:
            print("retry in 65 s:", e); time.sleep(65)
    raise SystemExit('Wikidata query failed')
def dist(a, b):
    R = 6371000; la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))
def pt(s):  # "Point(lng lat)"
    lng, lat = s.replace('Point(', '').replace(')', '').split()
    return float(lat), float(lng)
P = 'src/data/places.json'
places = json.load(open(P))
titles = sorted({p['wiki'] for p in places if p.get('wiki')})
rows = []
for i in range(0, len(titles), 400):
    vals = ' '.join('"%s"@en' % t.replace('"', '\\"') for t in titles[i:i + 400])
    rows += sparql(f'''SELECT ?title ?item ?coord ?image WHERE {{
      VALUES ?title {{ {vals} }}
      ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title.
      ?item wdt:P625 ?coord. OPTIONAL {{ ?item wdt:P18 ?image }} }}''')
wd = {}
for r in rows:
    wd.setdefault(r['title']['value'], r)
report = []
# Wikidata items whose coordinates are known to be wrong for our site (checked by hand)
KNOWN_BAD = {'naguleswaram', 'kataragama-kiri-vehera'}
for p in places:
    r = wd.get(p.get('wiki'))
    if not r: continue
    c = pt(r['coord']['value']); d = dist((p['lat'], p['lng']), c)
    qid = r['item']['value'].rsplit('/', 1)[-1]
    report.append({'id': p['id'], 'wiki': p['wiki'], 'qid': qid, 'distance_m': round(d), 'ours': [p['lat'], p['lng']], 'wikidata': [round(c[0], 5), round(c[1], 5)]})
    if MODE == 'apply':
        p['wikidata'] = qid
        if 'image' in r and not p.get('image'): p['image'] = r['image']['value'].replace('http://', 'https://')
        if p['id'] in KNOWN_BAD: continue
        if 40 <= d <= 25000 and p['precision'] != 'region' and 'Align tool' not in (p.get('description') or ''):
            p['lat'], p['lng'] = round(c[0], 5), round(c[1], 5)
            p['coordSource'] = f'wikidata:{qid}'
report.sort(key=lambda x: -x['distance_m'])
print(f"matched {len(report)} of {len(titles)} titled places")
for x in report[:15]: print(f"  {x['distance_m']:>7} m  {x['id']}  ({x['wiki']})")
big = [x for x in report if x['distance_m'] > 25000]
print(f"  >25 km (probably wrong article, not applied): {[x['id'] for x in big]}")

# ---------- import further heritage sites ----------
TYPES = {'Q839954': ('ruins', 'secular'), 'Q180987': ('stupa', 'buddhist'), 'Q5393308': ('temple', 'buddhist'), 'Q842402': ('kovil', 'hindu'),
         'Q32815': ('mosque', 'muslim'), 'Q16970': ('church', 'christian'), 'Q1785071': ('fort', 'secular'), 'Q57821': ('fort', 'secular'), 'Q44613': ('monastery', 'buddhist'), 'Q160742': ('monastery', 'buddhist')}
new, merged = [], []
GENERIC = {'raja', 'maha', 'rajamaha', 'vihara', 'viharaya', 'temple', 'church', 'kovil', 'statue', 'rock', 'the', 'sri', 'fort', 'dutch', 'mosque', 'st', 'saint', 'of', 'our', 'lady',
           'cave', 'devale', 'devalaya', 'sacred', 'ancient', 'purana', 'chaitya', 'stupa', 'dagoba', 'shrine', 'pirivena', 'grand', 'jumma', 'masjid', 'kandaswamy', 'amman', 'swami'}
TOWNS = {'colombo', 'kandy', 'galle', 'jaffna', 'negombo', 'batticaloa', 'trincomalee', 'matara', 'badulla', 'kalpitiya', 'mannar', 'matale', 'ratnapura', 'kurunegala', 'nallur', 'beruwala', 'hanguranketha', 'polonnaruwa', 'anuradhapura', 'kalutara', 'ampara', 'vaddukoddai', 'kotte'}
COMPAT = [{'stupa', 'temple', 'monastery', 'cave-temple', 'ruins', 'sculpture', 'shrine'}, {'kovil', 'temple', 'shrine'}, {'fort'}, {'church'}, {'mosque'}]
import difflib, re as _re
def core(name):
    n = _re.split(r'[(,]', name)[0].lower()
    toks = [t for t in _re.sub(r'[^a-z ]', ' ', n).split() if t not in GENERIC and t not in TOWNS and len(t) >= 4]
    # spelling normalisation only after generic words are gone
    return [t.replace('ee', 'i').replace('oo', 'u').replace('v', 'w') for t in toks]
def same_site(name, stype, p):
    if not any(stype in g and p['siteType'] in g for g in COMPAT): return False
    a, b = core(name), core(p['name'])
    return any(difflib.SequenceMatcher(None, x, y).ratio() >= 0.86 for x in a for y in b)
if MODE == 'apply':
    time.sleep(65)  # WDQS rate limit
    existing_wiki = {p.get('wiki') for p in places}
    existing_q = {p.get('wikidata') for p in places}
    q = f'''SELECT DISTINCT ?item ?itemLabel ?coord ?type ?title ?image ?inception WHERE {{
      VALUES ?type {{ {' '.join('wd:' + t for t in TYPES)} }}
      ?item wdt:P31 ?type; wdt:P17 wd:Q854; wdt:P625 ?coord.
      ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title.
      OPTIONAL {{ ?item wdt:P18 ?image }} OPTIONAL {{ ?item wdt:P571 ?inception }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }} }}'''
    seen = set()
    for r in sparql(q):
        qid = r['item']['value'].rsplit('/', 1)[-1]
        if qid in seen or qid in existing_q or r['title']['value'] in existing_wiki: continue
        seen.add(qid)
        lat, lng = pt(r['coord']['value'])
        if not (5.7 < lat < 10 and 79.4 < lng < 82): continue
        if any(dist((lat, lng), (p['lat'], p['lng'])) < 120 for p in places if p.get('siteType')): continue
        st0 = TYPES[r['type']['value'].rsplit('/', 1)[-1]][0]
        dup = next((p for p in places if p.get('siteType') and same_site(r['itemLabel']['value'], st0, p) and dist((lat, lng), (p['lat'], p['lng'])) < 15000), None)
        if dup:  # an existing curated site: adopt the surveyed position instead of importing a duplicate
            merged.append((r['itemLabel']['value'], dup['id'], round(dist((lat, lng), (dup['lat'], dup['lng'])))))
            dup['lat'], dup['lng'] = round(lat, 5), round(lng, 5); dup['coordSource'] = f'wikidata:{qid}'; dup.setdefault('wikidata', qid)
            if 'image' in r: dup.setdefault('image', r['image']['value'].replace('http://', 'https://'))
            continue
        st, rel = TYPES[r['type']['value'].rsplit('/', 1)[-1]]
        o = {'id': 'wd-' + qid.lower(), 'name': r['itemLabel']['value'], 'lat': round(lat, 5), 'lng': round(lng, 5), 'precision': 'approximate', 'kind': 'site',
             'siteType': st, 'religion': rel, 'wiki': r['title']['value'], 'wikidata': qid, 'importedFrom': 'wikidata', 'coordSource': f'wikidata:{qid}'}
        if 'image' in r: o['image'] = r['image']['value'].replace('http://', 'https://')
        inc = r.get('inception', {}).get('value', '')
        if inc[:1] in '-0123456789' and inc:
            y = int(inc[:inc.index('-', 1)]) if inc.startswith('-') else int(inc[:4])
            if -600 < y <= 2026: o['founded'] = y; o['foundedLabel'] = f'{abs(y)} BCE (Wikidata)' if y < 0 else f'{y} (Wikidata)'
        new.append(o)
    places += new
    json.dump(places, open(P, 'w'), indent=1, ensure_ascii=False)
    print(f"imported {len(new)} new sites; {sum(1 for x in report if 40 <= x['distance_m'] <= 25000)} coordinates corrected; merged {len(merged)} duplicates:")
    for m in merged: print('   merge', m)
json.dump({'matches': report, 'imported': [n['id'] for n in new]}, open('scripts/wikidata-report.json', 'w'), indent=1)
