// GDPR consent gate for idea-mode posts.
//
// A post that was built from uploaded photos (idea_data.images present) must
// carry an explicit consent flag before it can be published or scheduled —
// publishing identifiable people / names without consent is a GDPR problem.
//
// Posts that did NOT come from the idea pipeline (no idea_data / no images) are
// unaffected and return false, so normal blog posts publish as before.
export function ideaNeedsConsent(post: any): boolean {
  const idea = post?.ideaData;
  if (!idea) return false;
  const hasImages = Array.isArray(idea.images) && idea.images.length > 0;
  if (!hasImages) return false;
  return !(idea.consent && idea.consent.given === true);
}

export const CONSENT_REQUIRED_MESSAGE =
  'Einwilligung (DSGVO) erforderlich: Bitte bestätige im Idee-Modus, dass die Zustimmung der abgebildeten Personen vorliegt, bevor dieser Beitrag mit Fotos veröffentlicht oder geplant wird.';
