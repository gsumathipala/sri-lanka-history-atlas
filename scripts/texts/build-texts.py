"""Build public/texts/* from public-domain OCR/plain-text sources.
Usage: python3 -I scripts/texts/build-texts.py <download-dir> <out-dir>
Sources (all public domain): Geiger 1912 Mahavamsa (archive.org mahavamsaorgreat0000wilh),
Oldenberg 1879 Dipavamsa (archive.org dipavamsaancient00dipa), Legge 1886 Faxian (Gutenberg 2124),
Knox 1681 (Gutenberg 14346)."""
import json, os, re, sys
src, out = sys.argv[1], sys.argv[2]
ROMAN = {v: i for i, v in enumerate("I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII XXIII XXIV XXV XXVI XXVII XXVIII XXIX XXX XXXI XXXII XXXIII XXXIV XXXV XXXVI XXXVII XXXVIII XXXIX XL".split(), 1)}
CITE = re.compile(r"\b(ed\.|p\.|pp\.|cf\.|Cf\.|foll|Comm|i\.e\.|Vin\.|J\.R\.A\.S|S\.B\.E|Mahav|Dip\.|see |Sum\.|vol\.|v\. ?\d)")
FOOT_START = re.compile(r"^\s*([?'’‘\"*¹²³⁴⁵°§]|\d{1,2}\s|\d\))")

def clean_lines(lines):
    out_lines = []
    for ln in lines:
        s = ln.rstrip()
        t = s.strip()
        if re.fullmatch(r"[\d\s.,*'’‘]{1,6}", t or "x"):  # page / stray numbers
            continue
        letters = [c for c in t if c.isalpha()]
        if t and len(t) < 70 and letters and sum(c.isupper() for c in letters) / len(letters) > 0.85 and len(letters) > 3:
            continue  # running heads
        out_lines.append(s)
    return out_lines

def paragraphs(lines, strip_footnotes=True):
    paras, cur = [], []
    for ln in lines + [""]:
        if ln.strip():
            cur.append(ln.strip())
        elif cur:
            paras.append(cur)
            cur = []
    res = []
    for p in paras:
        if strip_footnotes and FOOT_START.match(p[0]) and len(p) <= 10 and CITE.search(" ".join(p)):
            continue
        text = ""
        for ln in p:
            if text.endswith("-") and not text.endswith(" -"):
                text = text[:-1] + ln
            else:
                text = (text + " " + ln).strip()
        text = re.sub(r"\s{2,}", " ", text)
        if len(text) > 2:
            res.append(text)
    return res

def write(work, n, title, paras, verses=None, extra=None):
    os.makedirs(f"{out}/{work}", exist_ok=True)
    o = {"work": work, "chapter": n, "title": title, "paragraphs": paras}
    if verses: o["verses"] = verses
    if extra: o.update(extra)
    json.dump(o, open(f"{out}/{work}/{n}.json", "w"), ensure_ascii=False)

index = {}
# ---------------- Mahavamsa (Geiger 1912) ----------------
L = open(f"{src}/mv_mahavamsaorgreat0000wilh.txt", encoding="utf-8", errors="replace").read().split("\n")
heads = [(i, ROMAN.get(m.group(1).replace("Y", "V"))) for i, ln in enumerate(L) if (m := re.match(r"^\s*CHAPTER ([IVXLY]+)\s*$", ln))]
heads = [(i, n) for i, n in heads if n]
end = next((i for i, ln in enumerate(L) if i > heads[-1][0] and re.match(r"^\s*(APPENDIX|INDEX|ADDENDA)", ln)), len(L))
mv = []
for k, (i, n) in enumerate(heads):
    j = heads[k + 1][0] if k + 1 < len(heads) else end
    body = L[i + 1:j]
    title = next((b.strip() for b in body if b.strip()), "")
    body = body[body.index(next(b for b in body if b.strip())) + 1:]
    write("mahavamsa", n, title.title(), paragraphs(clean_lines(body)))
    mv.append({"chapter": n, "title": title.title()})
index["mahavamsa"] = {"edition": "Geiger, W. (trans.) 1912, The Mahavamsa or the Great Chronicle of Ceylon (Pali Text Society). Public domain.", "sourceId": "geiger1912", "archive": "https://archive.org/details/mahavamsaorgreat0000wilh", "quality": "Uncorrected OCR; footnotes partly removed; chapter-level only (Geiger's translation is prose).", "chapters": mv}

# ---------------- Dipavamsa (Oldenberg 1879, translation part) ----------------
L = open(f"{src}/dipa.txt", encoding="utf-8", errors="replace").read().split("\n")
start = next(i for i, ln in enumerate(L) if ln.strip() == "TRANSLATION.")
tr = L[start:]
# chapter boundaries: roman-numeral heading lines (reliable in this scan), plus any
# verse "1." that restarts numbering without a heading (the missing ch. X); chapters are
# numbered by position, not by the OCR'd numeral.
ROM = re.compile(r"^\s*[IVXL]+\.\s*$")
end_i = next(i for i, ln in enumerate(tr) if "INDEX" in ln and "PROPER" in ln)
starts = [i for i in range(end_i) if ROM.match(tr[i])]
for i in range(end_i):
    if re.match(r"^\s*1\.\s+[A-Z]", tr[i]) and not any(0 <= i - st <= 4 for st in starts):
        prev = max([st for st in starts if st < i], default=None)
        # accept as a new chapter only if the previous chapter already reached high verse numbers
        chunk = " ".join(tr[prev:i]) if prev is not None else ""
        nums = [int(x) for x in re.findall(r"(?<![\w(])(\d{1,3})\.\s", chunk)]
        if nums and max(nums) > 20:
            starts.append(i)
starts = sorted(starts)
chapters = []
for k, st in enumerate(starts):
    en = starts[k + 1] if k + 1 < len(starts) else end_i
    t = "\n".join(clean_lines(tr[st + 1:en]))
    t = re.sub(r"-\s*\n\s*", "", t)
    t = re.sub(r"\s+", " ", t)
    verses, last, pos = [], 0, []
    for m in re.finditer(r"(?<![\w(])(\d{1,3})\.\s+(?=[A-Z‘'(\"„—])", t):
        n = int(m.group(1))
        if last < n <= last + 4:
            pos.append((n, m.start(), m.end()))
            last = n
    for k2, (n, s0, e0) in enumerate(pos):
        stop = pos[k2 + 1][1] if k2 + 1 < len(pos) else len(t)
        verses.append({"n": n, "text": t[e0:stop].strip()})
    chapters.append(verses)
dv = []
for ci, verses in enumerate(chapters, 1):
    write("dipavamsa", ci, f"Chapter {ci}", [], verses)
    dv.append({"chapter": ci, "title": f"Chapter {ci}", "verses": len(verses)})
index["dipavamsa"] = {"edition": "Oldenberg, H. (ed. & trans.) 1879, The Dipavamsa: An Ancient Buddhist Historical Record. Public domain.", "sourceId": "oldenberg1879", "archive": "https://archive.org/details/dipavamsaancient00dipa", "quality": "Uncorrected OCR. Verses split on Oldenberg's printed verse numbers, accepting only strictly sequential numbering; check against the scan.", "chapters": dv}

# ---------------- Faxian (Legge 1886), Ceylon chapters ----------------
L = open(f"{src}/faxian.txt", encoding="utf-8", errors="replace").read().split("\n")
heads = [(i, ROMAN[m.group(1)]) for i, ln in enumerate(L) if (m := re.match(r"^CHAPTER ([IVXL]+)\s*$", ln)) and m.group(1) in ROMAN]
fx = []
for k, (i, n) in enumerate(heads):
    if n not in (37, 38, 39, 40): continue
    j = heads[k + 1][0] if k + 1 < len(heads) else next((x for x in range(i, len(L)) if "END OF THE PROJECT GUTENBERG" in L[x]), len(L))
    body = L[i + 1:j]
    title = next((b.strip() for b in body if b.strip()), "")
    write("faxian", n, title, paragraphs(body, strip_footnotes=False))
    fx.append({"chapter": n, "title": title})
index["faxian"] = {"edition": "Legge, J. (trans.) 1886, A Record of Buddhistic Kingdoms. Project Gutenberg #2124. Public domain.", "sourceId": "legge1886", "archive": "https://archive.org/details/arecordofbuddhis02124gut", "quality": "Proofread Gutenberg transcription; Legge's notes are included inline.", "chapters": fx}

# ---------------- Knox (1681) ----------------
L = open(f"{src}/knox.txt", encoding="utf-8", errors="replace").read().split("\n")
# skip the table of contents: real chapters are those followed by substantial text
cands = [(i, ln.strip()) for i, ln in enumerate(L) if re.match(r"^(PART [IVX]+\.|CHAP\.? ?[IVXL]+\.)\s*$", ln.strip())]
kx, part, n = [], 0, 0
body_start = next(i for i, (li, t) in enumerate(cands) if t.startswith("PART") and i > 0 and cands[i][0] - cands[i - 1][0] > 200) if any(c[1].startswith("PART") for c in cands) else 0
real = []
for k in range(len(cands)):
    li, t = cands[k]
    nxt = cands[k + 1][0] if k + 1 < len(cands) else len(L)
    if t.startswith("PART"):
        part += 1
        continue
    if nxt - li < 25:  # table-of-contents entry
        continue
    real.append((li, nxt, part, t))
seen = set()
for li, nxt, pt, t in real:
    key = (pt, t)
    if key in seen: continue
    seen.add(key)
    n += 1
    body = L[li + 1:nxt]
    title = next((b.strip() for b in body if b.strip()), "")
    end_g = next((x for x in range(len(body)) if "END OF THE PROJECT GUTENBERG" in body[x]), len(body))
    write("knox", n, f"Part {pt}, {t.title()} {title[:90]}", paragraphs(body[:end_g], strip_footnotes=False))
    kx.append({"chapter": n, "title": f"Part {pt}, {t.title()} {title[:90]}"})
index["knox"] = {"edition": "Knox, R. 1681, An Historical Relation of the Island Ceylon. Project Gutenberg #14346. Public domain.", "sourceId": "knox1681", "archive": "https://archive.org/details/anhistoricalrela14346gut", "quality": "Proofread Gutenberg transcription.", "chapters": kx}
json.dump(index, open(f"{out}/index.json", "w"), ensure_ascii=False, indent=1)
for w, v in index.items(): print(w, len(v["chapters"]))
