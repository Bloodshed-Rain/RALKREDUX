---
name: feedback-typed-numeric-inputs
description: Steppers alone are insufficient for technician numeric input — always provide a typed fallback for hours, height, counts
metadata:
  type: feedback
---

Numeric inputs that techs use to record audit-relevant quantities (hours on rope, max height, counts) must always allow direct typing in addition to any stepper UI. Stepper-only inputs force rounding when the truth is a non-step value (e.g., 6.3 hr on a 0.5-step control).

**Why:** new-entry wizard Step 2 ships a +/− 0.5 stepper for hours with no typed input. Edit and Amend screens both expose a typed Field. The asymmetry means the create path forces rounding while the edit path doesn't — techs will either log false data, or save-as-draft and re-open in Edit to fix the number. Both are worse than just allowing typed entry from the start.

**How to apply:** For any field where:
- The valid range is wide (hours: 0–24, height: 0–1000+ ft), AND
- Decimal precision matters for downstream audit numbers (cumulative rope-hours, cert progression),

…ship a typed input. Steppers are great glove-friendly *augmentation*, but never a *replacement*. Pattern: tap the number itself to open keyboard; +/− buttons remain for quick adjustments. This is the create-vs-edit consistency principle: a tech should never need to "fix in edit" what the create screen made them round.
