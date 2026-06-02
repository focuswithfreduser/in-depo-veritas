/**
 * Single source of truth for the values used when creating a new organisation
 * (either through onboarding via `me.update` or explicit `organization.createOrganization`).
 *
 * Previously the two code paths drifted: `me.update` started a new org with 0
 * trial credits while `organization.createOrganization` gave 1. The latter is
 * the intended default (see `billing.discount`, which assumes a baseline of 1
 * when it grants "+10 from discount, total 11"), so we keep the value here.
 */
export const ORGANIZATION_FREE_TRIAL_DAYS = 14;
export const ORGANIZATION_FREE_TRIAL_CREDITS = 1;
