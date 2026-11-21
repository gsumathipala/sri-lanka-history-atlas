# Methodology

This atlas aims to be a scholarly reference, not a narrative. Every claim must be traceable to evidence, and uncertainty must stay visible rather than being smoothed into a confident story.

## 1. Evidence hierarchy

Each event lists one or more **evidence items**. Each item has a *type* (what kind of evidence it is) and a *source* (where it is published). From strongest to weakest for establishing that something happened and when:

| Tier | Evidence types | Notes |
|---|---|---|
| A | `radiometric`, `archaeological`, `epigraphic`, `numismatic`, `architectural`, `scientific` | Material evidence. Contemporary inscriptions are the backbone of dating from the 3rd c. BCE. |
| B | `archival`, `legal-official`, `foreign-account`, `contemporary-report` | Contemporary or near-contemporary documents. Check the author's position and purpose. |
| C | `chronicle` | The vamsa literature (Dipavamsa, Mahavamsa, Culavamsa), Rajavaliya, Yalpana Vaipava Malai, etc. Indispensable, but composed long after many events they describe, with a religious and dynastic agenda. |
| D | `oral-tradition` | Admissible for traditions, never on its own for historical claims. |
| — | `synthesis` | Modern scholarly interpretation. Use it to support *interpretation*, but cite the primary evidence the scholar relied on wherever possible. The validator warns when an entry rests only on synthesis. |

## 2. Confidence ratings

| Rating | Use when |
|---|---|
| **established** | At least two independent lines of evidence agree, e.g. an inscription and a chronicle, or radiocarbon dates and stratigraphy. |
| **probable** | Good evidence, but the date, the agents or the details are uncertain. |
| **traditional** | The event rests mainly on chronicle tradition without independent corroboration. Most Anuradhapura-period regnal dates fall here. |
| **contested** | Specialists actively disagree on the facts, the date or the meaning. The entry **must** include `historiography` and/or `perspectives`. |
| **legendary** | Mythic or religious narratives (e.g. Vijaya, the Buddha's visits). They are included because they shaped the island's culture and memory, and labelled clearly. |

## 3. Dating conventions

- Years are signed integers: `-250` = 250 BCE, `1505` = 1505 CE. There is **no year 0**.
- Prehistoric dates are given as **BP** (before 1950) in labels and stored as `1950 - BP`. Where possible, cite calibrated radiocarbon ages (cal BP) and give the laboratory dates in the evidence description.
- Chronicle-derived dates for the Anuradhapura period follow the conventional chronology (Geiger), which may be off by up to ~60 years before the 1st c. CE. Use `dateNote` to say how a date was derived.
- `dateLabel` is the human-readable date and can express uncertainty ("1505 or 1506", "c. 13th century").

### Two chronologies

Regnal dates before the 2nd century CE exist in two systems. The **conventional** one counts from the Buddha's parinibbana in 544 BCE and is used in most Sri Lankan lists. **Geiger's corrected** one is based on c. 483 BCE and aligns Devanampiya Tissa with Asoka, giving reigns about 60 years later. Rulers are stored in the conventional system with Geiger's dates alongside. Events dated through the Asokan synchronism (Mahinda, the Bodhi tree) sit at c. 250 BCE, so the header may show a different "current king" at that date. That mismatch is deliberate and explained in the entry "The chronology problem of the early kings".

## 4. Places and geolocation

- `precision: exact` is only for securely identified, surveyed sites.
- `approximate` is for sites located to within a few km, or where the published coordinates have not been checked.
- `region` is for events tied to a territory (Ruhuna, the plantation districts) rather than a point.
- Traditional or disputed identifications (e.g. Tambapanni) must say so in the place `description`.

## 5. Contested and sensitive history

Sri Lankan history is heavily politicised: ethnic origins, the Elara–Dutthagamani narrative, the medieval Tamil kingdoms, 1983 and the end of the war in 2009. For these topics:

1. Present documented facts neutrally and attribute contested figures (e.g. casualty estimates) to named sources.
2. Use `perspectives` to set out significant positions side by side, each with its own citation, including official, UN, scholarly and community sources.
3. Do not present chronicle narratives as settled fact, and do not dismiss them. Explain what they are.
4. Cover Sinhala, Tamil, Muslim, Malaiyaha Tamil, Burgher, Vedda and other communities' histories in their own right.

## 6. Review workflow

Every entry has `review.status`:

- `draft`: compiled from secondary knowledge; citations identified but **not yet checked** against the physical/digital source.
- `reviewed`: a named reviewer has checked every evidence item against the cited source, including chapter, page or inscription numbers, and recorded `reviewer` and `date`.

**All entries in the initial seed are `draft`.** They were compiled with AI assistance. The cited works are real, standard references, but locators (chapter/verse/page), figures and specific attributions must be verified before an entry is marked reviewed.

## 7. Known gaps (research backlog)

Run `npm run validate` to list entries that rely only on synthesis or have thin evidence. Priority areas for expansion:

- Primary texts: Rajavaliya, Yalpana Vaipava Malai, Sandesa poems, Kandyan Convention text, VOC archives (Sri Lanka National Archives), Colonial Office CO 54 series, Hansard.
- Coverage: Vedda history; Muslim trading communities; the Eastern Province; women's history; labour and caste; numismatics (Roman, Lakshmi-plaque, Chinese coins); Abhayagiri and Mahayana Buddhism; Hindu temple history; the Mahaweli scheme; the post-2009 period.
- Geography: historical boundary polygons (Rajarata, Ruhuna, Mayarata; Kandyan disavanies; colonial provinces) and georeferenced historical maps (e.g. Dutch VOC charts, the 1880s Surveyor-General maps).

## 8. Verification tools and their limits

- **Chronicle references** are checked by `scripts/verify-chronicle-refs.py`, which searches the cited chapter of the public-domain translation for the subject's name, allowing for spelling variants such as Geiger's "samgha" and OCR's "ii" for ū. A miss is a prompt for human checking, not proof of error: the subject may be called "the king". The check has already caught real errors, such as Abhayagiri's founding cited to Dipavamsa 20 instead of 19. Verse-level references are added only where the verse can be read in the text (Dipavamsa).
- **The texts are uncorrected OCR** (Mahavamsa, Dipavamsa); the Faxian and Knox texts are proofread Gutenberg transcriptions. Quote from the printed edition, not from the OCR.
- **Coordinates**: `scripts/wikidata-sync.py` compares positions with Wikidata and takes Wikidata's position when the difference is between 40 m and 25 km. Wikidata itself can be wrong (Naguleswaram is placed in Jaffna town), so known errors are excluded by hand. Imported sites are labelled "uncurated" until someone reviews them.
- **Historical maps** are fitted with an affine transform to control points, and each states its RMS error. They show how a period's map makers saw the island; they are not accurate geography.
- **Sinhala and Tamil interface strings** were drafted without native-speaker review and should be checked before publication. Entry content is in English.
