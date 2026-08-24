// Can the article writer claim things that are not true?
//
// The prompt was good — E-E-A-T, search-question headings, a comparison table reasoned for
// snippets, one first-person note, an emotional close. It was also welded to one studio:
//
//   "Du bist erfahrene:r Texter:in für New Age Fotografie, ein Tageslichtstudio in
//    Wien-Margareten (1050), nahe Naschmarkt" — plus thirteen years, 300+ shoots, 4.8
//    stars, and fifteen Viennese pillar URLs offered as "internal links you may use".
//
// Pointed at a studio that opened last year, that does not produce weak copy. It produces
// CONFIDENT copy claiming a decade of experience they have never had, under their own name,
// linking to pages that 404. Fabricated E-E-A-T is worse than none.
//
// Two things are checked here, and they are different in kind:
//   1. that no origin-studio literal survives anywhere in the writer, and
//   2. that the CLAIMS a studio may make are derived from their own record — which is
//      tested by running the code, because a grep cannot tell a real claim from a literal.
//
// Run: npx tsx scripts/gal-verify-blog-writer.ts
import fs from 'fs';
import { voiceRules, type StudioVoice } from '../server/services/blogStudioVoice';
import { findConflicts, coverageRules, type CoverageItem, CONFLICT_THRESHOLDS } from '../server/services/blogCoverage';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const code = (s: string) => s.split('\n').filter((l) => {
  const t = l.trim();
  return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
}).join('\n');

const writer = fs.readFileSync('server/services/blogIdeaWriter.ts', 'utf8');
const writerCode = code(writer);

console.log('\n=== no studio is hardcoded into the writer ===');
for (const literal of ['New Age Fotografie', 'Wien-Margareten', 'Naschmarkt', 'Tageslichtstudio', 'Schönbrunn', 'Prater', 'Donauinsel']) {
  check(`"${literal}" is gone`, !writerCode.includes(literal));
}
// The old numbers were the sharpest edge: they read as proof.
check('no hardcoded years of experience', !/13 Jahren|thirteen years/i.test(writerCode));
check('no hardcoded shoot count', !/300\+|300 Shootings/i.test(writerCode));
check('no hardcoded star rating', !/4[.,]8\s*★|4[.,]8 Sterne/i.test(writerCode));
check('the Viennese link list is gone', !/familienfotos-wien|hochzeitsfotografie-wien/.test(writerCode));

console.log('\n=== a studio may claim only what it can evidence ===');
const base: StudioVoice = {
  name: 'Test Studio', ownerName: 'A Owner', ownerRole: 'Photographer', place: 'Testville',
  language: 'en', yearsActive: null, credentials: [], rating: null, links: [], positioning: '',
};

// A studio with a real founding year gets a real number.
const withYears = voiceRules({ ...base, yearsActive: 12 }, 'en').join(' ');
check('a known founding year becomes a stated fact', /12 years in business/.test(withYears));
check('and is fenced as verifiable', /VERIFIABLE FACTS/.test(withYears));

// A studio with none gets no number AND a different instruction.
const blank = voiceRules(base, 'en').join(' ');
check('an unknown founding year states no duration', !/\d+ years in business/.test(blank));
check('and the writer is told to lean on the work instead', /Ground the article in CRAFT/.test(blank));
check('the no-fabrication rule is present either way',
  /INVENT NO CREDENTIALS/.test(blank) && /INVENT NO CREDENTIALS/.test(withYears));

// Ratings are the easiest thing to invent and the most damaging to fake.
check('no rating is claimed without a source', !/★/.test(blank));
const rated = voiceRules({ ...base, rating: { average: 4.9, count: 31 } }, 'en').join(' ');
check('a real rating IS stated when one exists', /4\.9 ★ from 31 reviews/.test(rated));
// Credentials are the studio's own words; they must survive verbatim.
const cred = voiceRules({ ...base, credentials: ['Certified Professional Photographer'] }, 'en').join(' ');
check('entered credentials are carried through', /Certified Professional Photographer/.test(cred));

console.log('\n=== the language follows the studio, not the origin ===');
check('the writer resolves a language from the studio', /voice\.language === 'de' \? 'de' : 'en'/.test(writerCode));
check('the context pack is localised', /buildContextPack\(input, lang\)/.test(writerCode));
check('German is still available for a German studio', /'de' \? 'de'/.test(writerCode));

console.log('\n=== internal links are real pages, or none ===');
const cov: CoverageItem[] = [
  { url: '/maternity-photography', title: 'Maternity Photography in Shreveport', kind: 'page', terms: ['maternity', 'shreveport'] },
  { url: '/newborn-photography', title: 'Newborn Photography in Shreveport', kind: 'page', terms: ['newborn', 'shreveport'] },
];
const rules = coverageRules(cov, [], 'en').join(' ');
check('published pages are offered as the only link targets', /ONLY permitted internal links/.test(rules));
check('and they are the studio\'s real URLs', /\/maternity-photography/.test(rules));
// A studio with nothing published must be told to link nothing, not to guess.
check('a studio with no pages is told to link nothing',
  /Do NOT add internal links/.test(writerCode));

console.log('\n=== the cannibalisation gate fires on collisions and stays quiet otherwise ===');
// A duplicate of an existing pillar.
const dup = findConflicts('Maternity Photography in Shreveport', undefined, cov);
check('an exact duplicate is caught', dup.length > 0 && dup[0].score >= CONFLICT_THRESHOLDS.block,
  dup[0] ? `${(dup[0].score * 100).toFixed(0)}%` : 'no hit');
check('and it names the page it collides with', dup[0]?.item.url === '/maternity-photography');

// A genuinely different article in the same subject area.
const far = findConflicts('How we light a cake smash', undefined, cov);
check('an unrelated angle is not flagged', far.length === 0, `${far.length} hit(s)`);

// THE false positive that would kill this feature: every page of a Shreveport studio says
// "shreveport", so a term on most of the site must count for nothing.
const shared = findConflicts('Wedding photography in Shreveport', undefined, cov);
check('a term common to the whole site does not trigger it', shared.length === 0,
  shared.length ? `flagged against ${shared[0].item.url} on ${shared[0].shared.join(',')}` : 'quiet');

// Drafts compete with nothing; warning about them trains the studio to ignore warnings.
const coverageSrc = fs.readFileSync('server/services/blogCoverage.ts', 'utf8');
check('only published content is indexed', /status = 'published'/.test(coverageSrc) && /published = true/.test(coverageSrc));
check('the overlap measure is asymmetric on purpose', /Asymmetric on purpose/.test(coverageSrc));

console.log('\n=== the studio sees the gate before it generates ===');
const panel = fs.readFileSync('client/src/components/admin/IdeaModePanel.tsx', 'utf8');
const panelCode = code(panel);
check('the panel checks coverage', /\/api\/blog\/coverage-check/.test(panelCode));
check('it renders the conflicting page as a link', /conflicts\.map\(/.test(panelCode));
check('it shows what actually overlaps', /overlap on:/.test(panel));
// Advisory, not a block: a gate that stops the studio gets worked around.
check('Generate is NOT disabled by a conflict',
  !/disabled=\{[^}]*conflicts/.test(panelCode));
check('and the panel says so', /You can still generate/.test(panel));
const routes = fs.readFileSync('server/routes.ts', 'utf8');
check('the endpoint exists', /app\.get\("\/api\/blog\/coverage-check"/.test(routes));
check('it is read-only', !/INSERT|UPDATE|DELETE/.test(
  routes.slice(routes.indexOf('/api/blog/coverage-check'), routes.indexOf('/api/blog/coverage-check') + 1800)));

console.log('\n=== the 2026 additions ===');
check('claims must be grounded in the actual photographs', /GROUND IN THE PHOTOGRAPHS/.test(writer));
check('key claims must stand alone for AI answers', /EXTRACTABILITY/.test(writer));
check('the FAQ is returned as data, not only prose', /faq: Array<\{ question: string; answer: string \}>/.test(writer));
check('a malformed faq cannot crash the caller', /Array\.isArray\(p\.faq\)/.test(writerCode));
check('the model is configurable without a deploy', /process\.env\.BLOG_WRITER_MODEL/.test(writerCode));

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — the writer speaks as this studio, and claims only what it can evidence\n');
process.exit(bad ? 1 : 0);
