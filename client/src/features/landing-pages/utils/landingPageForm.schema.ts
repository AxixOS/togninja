import type { LandingPageWizardFormValues, LandingPageWizardStepKey } from '../types/landingPageGeneration.types';

// ── Per-step validation ──────────────────────────────────────────

export interface WizardStepValidation {
  valid: boolean;
  errors: string[];
}

const nonEmpty = (v: string) => v.trim().length > 0;
const hasAtLeastOneNonEmpty = (arr: string[]) => arr.some(nonEmpty);

function validateBasics(v: LandingPageWizardFormValues): WizardStepValidation {
  const errors: string[] = [];
  if (!v.pagePurpose) errors.push('Page purpose is required');
  if (!nonEmpty(v.serviceType)) errors.push('Service type is required');
  return { valid: errors.length === 0, errors };
}

function validateOffer(v: LandingPageWizardFormValues): WizardStepValidation {
  const errors: string[] = [];
  if (!nonEmpty(v.mainOffer)) errors.push('Main offer is required');
  return { valid: errors.length === 0, errors };
}

function validateAudience(v: LandingPageWizardFormValues): WizardStepValidation {
  const errors: string[] = [];
  if (!nonEmpty(v.targetAudience)) errors.push('Target audience is required');
  return { valid: errors.length === 0, errors };
}

function validateTrust(_v: LandingPageWizardFormValues): WizardStepValidation {
  // All optional — trust signals are recommended but not required
  return { valid: true, errors: [] };
}

function validateCta(v: LandingPageWizardFormValues): WizardStepValidation {
  const errors: string[] = [];
  if (!nonEmpty(v.primaryCta)) errors.push('Primary CTA is required');
  return { valid: errors.length === 0, errors };
}

function validateSeo(_v: LandingPageWizardFormValues): WizardStepValidation {
  // All optional
  return { valid: true, errors: [] };
}

function validateAssets(_v: LandingPageWizardFormValues): WizardStepValidation {
  // All optional
  return { valid: true, errors: [] };
}

const validators: Record<LandingPageWizardStepKey, (v: LandingPageWizardFormValues) => WizardStepValidation> = {
  basics: validateBasics,
  offer: validateOffer,
  audience: validateAudience,
  trust: validateTrust,
  cta: validateCta,
  seo: validateSeo,
  assets: validateAssets,
};

export function validateWizardStep(
  stepKey: LandingPageWizardStepKey,
  values: LandingPageWizardFormValues
): WizardStepValidation {
  return validators[stepKey](values);
}

export function validateAllWizardSteps(
  values: LandingPageWizardFormValues
): { valid: boolean; stepErrors: Record<LandingPageWizardStepKey, WizardStepValidation> } {
  const steps: LandingPageWizardStepKey[] = ['basics', 'offer', 'audience', 'trust', 'cta', 'seo', 'assets'];
  const stepErrors = {} as Record<LandingPageWizardStepKey, WizardStepValidation>;
  let allValid = true;
  for (const step of steps) {
    stepErrors[step] = validateWizardStep(step, values);
    if (!stepErrors[step].valid) allValid = false;
  }
  return { valid: allValid, stepErrors };
}
