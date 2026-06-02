import { describe, expect, it } from "vitest";

import {
  ORGANIZATION_FREE_TRIAL_CREDITS,
  ORGANIZATION_FREE_TRIAL_DAYS,
} from "./organization-defaults";

// Regression guard for B7. The two organisation creation paths (me.update
// onboarding flow and organization.createOrganization) used to disagree:
// the former handed out 0 trial credits, the latter 1. billing.discount
// assumes a baseline of 1 ("1 default + 10 from discount"), so the
// reference value is 1.
describe("organization defaults", () => {
  it("grants exactly 1 trial credit by default", () => {
    expect(ORGANIZATION_FREE_TRIAL_CREDITS).toBe(1);
  });

  it("trial window is two weeks (14 days)", () => {
    expect(ORGANIZATION_FREE_TRIAL_DAYS).toBe(14);
  });
});
