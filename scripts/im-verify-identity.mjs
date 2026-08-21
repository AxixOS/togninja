// The tenant resolver against the LIVE studio row: does it produce Sports Action Photo's
// identity, and does it refuse the traps?
const { getImageIdentity, localityOf } = await import('../server/lib/studioImageIdentity.ts');

let bad = 0;
const check = (label, ok, detail) => { if (!ok) bad++; console.log(`  ${ok?'PASS':'FAIL'}  ${label}${detail!==undefined?'  '+detail:''}`); };

console.log('\n=== localityOf: the traps ===');
check("'28 Nevill Avenue\nHove, BN3 7NA' -> Hove", localityOf('28 Nevill Avenue\nHove, BN3 7NA', 'UK', null) === 'Hove', localityOf('28 Nevill Avenue\nHove, BN3 7NA','UK',null));
check("city 'UK' alone is refused",       localityOf('', 'UK', null) === undefined, String(localityOf('','UK',null)));
check("city 'USA' alone is refused",      localityOf('', 'USA', null) === undefined, String(localityOf('','USA',null)));
check("city == country is refused",       localityOf('', 'Austria', 'Austria') === undefined, String(localityOf('','Austria','Austria')));
check("a real city is kept",              localityOf('', 'Brighton', 'United Kingdom') === 'Brighton', String(localityOf('','Brighton','United Kingdom')));
check("'Wehrgasse 11\n1050 Wien' -> Wien", localityOf('Wehrgasse 11\n1050 Wien', '', '') === 'Wien', String(localityOf('Wehrgasse 11\n1050 Wien','','')));

console.log('\n=== the live tenant ===');
const id = await getImageIdentity();
console.log('   ', JSON.stringify(id, null, 2).split('\n').join('\n    '));
check('creator is the studio',   id.creator === 'Sports Action Photo', String(id.creator));
check('copyright has no city',   !!id.copyright && !/UK|Hove|Wien/.test(id.copyright), String(id.copyright));
check('city is Hove, not UK',    id.city === 'Hove', String(id.city));
check('country is absent (col defaults to Austria)', id.country === undefined, String(id.country));
check('gps resolved',            !!id.gps && Math.abs(id.gps.lat - 50.828) < 0.01, JSON.stringify(id.gps));
check('services from the pillars', (id.services||[]).length >= 3, String((id.services||[]).slice(0,3).join(' / ')));

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED\n');
process.exit(bad ? 1 : 0);
