import { useSyncExternalStore } from 'react'

/** Interface language. Entry content is English for now; UI strings are translated.
 *  Sinhala and Tamil strings should be reviewed by native speakers (see docs/CONTRIBUTING.md). */
export type Lang = 'en' | 'si' | 'ta'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'si', label: 'සිංහල' },
  { id: 'ta', label: 'தமிழ்' },
]

const STR = {
  title: ['Lanka Through Time', 'කාලය හරහා ලංකාව', 'காலத்தினூடே இலங்கை'],
  subtitle: ['An evidence-based historical atlas of Sri Lanka', 'සාක්ෂි මත පදනම් වූ ශ්‍රී ලංකා ඓතිහාසික සිතියම් පොත', 'சான்றுகளை அடிப்படையாகக் கொண்ட இலங்கையின் வரலாற்று நிலவரைபடம்'],
  search: ['Search events, people, places…', 'සිදුවීම්, පුද්ගලයින්, ස්ථාන සොයන්න…', 'நிகழ்வுகள், நபர்கள், இடங்களைத் தேடுக…'],
  tab_list: ['In view', 'දැක්මේ ඇති', 'காட்சியில்'],
  tab_tours: ['Tours', 'චාරිකා', 'சுற்றுலாக்கள்'],
  tab_rulers: ['Rulers', 'පාලකයෝ', 'ஆட்சியாளர்கள்'],
  tab_relics: ['Relics', 'ධාතු', 'புனிதச் சின்னங்கள்'],
  tab_chronicles: ['Chronicles', 'වංශකථා', 'வம்ச நூல்கள்'],
  tab_sources: ['Sources', 'මූලාශ්‍ර', 'மூலங்கள்'],
  tab_about: ['About', 'පිළිබඳව', 'பற்றி'],
  banner: [
    'Seed dataset: entries are unreviewed drafts. They cite standard scholarly works, but locators and figures still need checking against the sources.',
    'මූලික දත්ත: ඇතුළත් කිරීම් තවම සමාලෝචනය නොකළ කෙටුම්පත් වේ. ඒවා ප්‍රමිත විද්වත් කෘති උපුටා දක්වයි; නමුත් පිටු අංක හා සංඛ්‍යා මූලාශ්‍ර සමඟ තහවුරු කළ යුතුය.',
    'ஆரம்பத் தரவு: பதிவுகள் இன்னும் மீளாய்வு செய்யப்படாத வரைவுகள். அவை தரமான ஆய்வு நூல்களை மேற்கோள் காட்டுகின்றன; ஆனால் பக்க எண்களும் எண்ணிக்கைகளும் மூலங்களுடன் சரிபார்க்கப்பட வேண்டும்.',
  ],
  travel: ['▶ Travel', '▶ ගමන් කරන්න', '▶ பயணி'],
  pause: ['❚❚ Pause', '❚❚ නවත්වන්න', '❚❚ இடைநிறுத்து'],
  window: ['Window', 'කාල කවුළුව', 'கால இடைவெளி'],
  alltime: ['All time', 'සියලු කාලය', 'எல்லாக் காலமும்'],
  hint: ['Drag the timeline, or use the arrow keys, to move through time.', 'කාලය හරහා යාමට කාලරේඛාව අදින්න, නැතහොත් ඊතල යතුරු භාවිත කරන්න.', 'காலத்தினூடே செல்ல காலக்கோட்டை இழுக்கவும் அல்லது அம்புக்குறி விசைகளைப் பயன்படுத்தவும்.'],
  sites: ['Sacred & historic sites', 'පූජනීය හා ඓතිහාසික ස්ථාන', 'புனித மற்றும் வரலாற்றுத் தலங்கள்'],
  undated: ['Undated imported sites', 'දින නොදන්නා ආනයනික ස්ථාන', 'காலம் அறியப்படாத இறக்குமதித் தலங்கள்'],
  boundaries: ['Kingdom boundaries, schematic', 'රාජධානි සීමා (දළ සටහන)', 'இராச்சிய எல்லைகள் (தோராயம்)'],
  filters_show: ['▸ Layers & filters', '▸ ස්තර හා පෙරහන්', '▸ அடுக்குகளும் வடிகட்டிகளும்'],
  filters_hide: ['▾ Hide filters', '▾ පෙරහන් සඟවන්න', '▾ வடிகட்டிகளை மறை'],
  evidence: ['Evidence', 'සාක්ෂි', 'சான்றுகள்'],
  perspectives: ['Perspectives', 'දෘෂ්ටිකෝණ', 'கண்ணோட்டங்கள்'],
  historiography: ['Historiography & caveats', 'ඉතිහාස ලේඛනය හා අවවාද', 'வரலாற்றியலும் எச்சரிக்கைகளும்'],
  inchronicles: ['In the chronicles', 'වංශකථාවල', 'வம்ச நூல்களில்'],
  stories: ['Stories', 'කතා', 'கதைகள்'],
  media: ['Media & further reading', 'මාධ්‍ය හා වැඩිදුර කියවීම', 'ஊடகமும் மேலதிக வாசிப்பும்'],
  alsohere: ['Also at these places', 'මෙම ස්ථානවල තවත්', 'இந்த இடங்களில் மேலும்'],
  near: ['📍 Near me', '📍 මා අසල', '📍 என் அருகில்'],
  cat_prehistory: ['Prehistory', 'ප්‍රාග් ඉතිහාසය', 'வரலாற்றுக்கு முந்தைய காலம்'],
  cat_polity: ['States & kingship', 'රාජ්‍ය හා රජකම', 'அரசுகளும் அரசாட்சியும்'],
  cat_religion: ['Religion', 'ආගම', 'சமயம்'],
  cat_conflict: ['Conflict', 'ගැටුම්', 'மோதல்கள்'],
  cat_economy: ['Economy & irrigation', 'ආර්ථිකය හා වාරිමාර්ග', 'பொருளாதாரமும் நீர்ப்பாசனமும்'],
  cat_culture: ['Culture & writing', 'සංස්කෘතිය හා ලේඛනය', 'பண்பாடும் எழுத்தும்'],
  'cat_foreign-contact': ['Foreign contact', 'විදේශ සබඳතා', 'வெளிநாட்டுத் தொடர்புகள்'],
  cat_colonial: ['Colonial rule', 'යටත් විජිත පාලනය', 'குடியேற்ற ஆட்சி'],
  cat_society: ['Society', 'සමාජය', 'சமூகம்'],
  cat_politics: ['Modern politics', 'නූතන දේශපාලනය', 'நவீன அரசியல்'],
  cat_disaster: ['Disaster & epidemic', 'ව්‍යසන හා වසංගත', 'அனர்த்தங்களும் தொற்றுநோய்களும்'],
  conf_established: ['Established', 'තහවුරු', 'நிறுவப்பட்டது'],
  conf_probable: ['Probable', 'සම්භාව්‍ය', 'சாத்தியமானது'],
  conf_traditional: ['Traditional', 'සම්ප්‍රදායික', 'மரபுவழி'],
  conf_contested: ['Contested', 'විවාදාත්මක', 'சர்ச்சைக்குரியது'],
  conf_legendary: ['Legendary', 'ජනප්‍රවාද', 'புராணக்கதை'],
  bce: ['BCE', 'ක්‍රි.පූ.', 'கி.மு.'],
  ce: ['CE', 'ක්‍රි.ව.', 'கி.பி.'],
} as const
export type StrKey = keyof typeof STR
const IDX: Record<Lang, number> = { en: 0, si: 1, ta: 2 }

let lang: Lang = (() => {
  try {
    const v = localStorage.getItem('lt-lang') as Lang | null
    return v && v in IDX ? v : 'en'
  } catch {
    return 'en'
  }
})()
const subs = new Set<() => void>()
export function getLang() {
  return lang
}
export function setLang(l: Lang) {
  lang = l
  try {
    localStorage.setItem('lt-lang', l)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = l
  subs.forEach((f) => f())
}
export function tr(k: StrKey): string {
  return STR[k][IDX[lang]]
}
export function useT() {
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => lang,
  )
  return tr
}
