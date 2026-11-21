import { useEffect, useRef, useState } from 'react'

/** Public-domain primary texts shipped in public/texts (see scripts/texts/build-texts.py). */
export interface TextIndexEntry {
  edition: string
  sourceId: string
  archive: string
  quality: string
  chapters: { chapter: number; title: string; verses?: number }[]
}
export type TextIndex = Record<string, TextIndexEntry>

interface ChapterText {
  work: string
  chapter: number
  title: string
  paragraphs: string[]
  verses?: { n: number; text: string }[]
}

const base = import.meta.env.BASE_URL
let indexPromise: Promise<TextIndex | null> | undefined
export function loadTextIndex(): Promise<TextIndex | null> {
  indexPromise ??= fetch(`${base}texts/index.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
  return indexPromise
}
const chapterCache = new Map<string, Promise<ChapterText | null>>()
function loadChapter(work: string, n: number) {
  const k = `${work}/${n}`
  if (!chapterCache.has(k))
    chapterCache.set(
      k,
      fetch(`${base}texts/${k}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    )
  return chapterCache.get(k)!
}

function inRange(n: number, range?: string) {
  if (!range) return false
  return range.split(',').some((part) => {
    const [a, b] = part.split('-').map(Number)
    return b ? n >= a && n <= b : n === a
  })
}

export function TextReader({ work, chapter, verses }: { work: string; chapter: number; verses?: string }) {
  const [text, setText] = useState<ChapterText | null | undefined>(undefined)
  const [meta, setMeta] = useState<TextIndexEntry>()
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setText(undefined)
    loadChapter(work, chapter).then(setText)
    loadTextIndex().then((i) => setMeta(i?.[work]))
  }, [work, chapter])
  useEffect(() => {
    if (text && verses) box.current?.querySelector('.hl')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [text, verses])
  if (text === undefined) return <div className="reader muted">Loading text…</div>
  if (text === null) return <div className="reader muted">No public-domain text is available for this chapter yet.</div>
  return (
    <div className="reader" ref={box}>
      <div className="reader-head">
        <strong>{text.title}</strong>
        {meta && (
          <div className="muted small">
            {meta.edition}{' '}
            <a href={meta.archive} target="_blank" rel="noreferrer">
              scan / source
            </a>
            <br />
            {meta.quality}
          </div>
        )}
      </div>
      {text.verses
        ? text.verses.map((v) => (
            <p key={v.n} id={`v-${v.n}`} className={inRange(v.n, verses) ? 'verse hl' : 'verse'}>
              <sup>{v.n}</sup> {v.text}
            </p>
          ))
        : text.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}
