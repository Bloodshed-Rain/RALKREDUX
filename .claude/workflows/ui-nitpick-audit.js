export const meta = {
  name: 'ui-nitpick-audit',
  description: 'Comprehensive UI nitpick audit of RALB: find + adversarially verify + synthesize a prioritized, file:line-cited report (no auto-edits)',
  phases: [
    { title: 'Audit', detail: '10 finders: 5 screen-groups (all 28 screens) + 5 cross-cutting deep sweeps' },
    { title: 'Verify', detail: 'per-finder adversarial re-check against code + intentional baseline' },
    { title: 'Design', detail: 'concrete proposals: Today Open-work, Gear density, inline-red validation' },
    { title: 'Synthesize', detail: 'dedup + tier into one report' },
  ],
};

const ROOT = 'C:/Users/MC/Desktop/RALB-Codex-Edition';

// ── Intentional baseline: finders must NOT report these as defects ──
const BASELINE = `
INTENTIONAL DESIGN DECISIONS — DO NOT REPORT THESE AS DEFECTS:
- Raw SQL strings in services; expo-router route directory layout; runtimeVersion fingerprint + iOS bundle id.
- Real-auth hard-gate via AuthGate.
- Heliotype palette: accent === danger === #8B1F1A (oxblood collapse) — distinguished by SHAPE (danger = outlined ink-on-bone), NOT a contrast bug.
- 12% black insets (rgba(0,0,0,0.12)) on saturated-accent rows (e.g. new-entry ChoiceRow emphasis) — intentional "depressed" look on every accent hue.
- Custom borderWidth:1 containers in screens NOT bumped to 1.5 on Heliotype — only PRIMITIVES (Card/Field/Pill/Button) carry the heavier Heliotype border; screen-level containers intentionally do not.
- The LARGE functional icon size is INTENTIONAL: UI_SCALE(1.18) x ICON_SCALE(1.4) ~= 1.65x base, owner-approved. Do NOT report "icons are too big". Report ALIGNMENT / OVERFLOW / CENTERING / wrong-box-size only.
- Compliance: the app is never described as SPRAT/IRATA-"accepted". Do NOT propose such copy.

KNOWN-CLASS (report instances, but mark severity P3 and note "known-class"):
- Typography drift: inline fontFamily/fontSize/fontWeight on some screens instead of type.* from src/ui/theme/type.ts.
- Thin async-state UX: \`return null\` on loading, unhandled isError, no skeletons.
- Field primitive placeholder/cursor visual fusion when a placeholder starts with a vertical-stem letter (I/l/J) and the field is focused at position 0.
`;

// ── Confirmed systemic bug to reference (don't re-derive) ──
const ICON_ROOT_CAUSE = `
CONFIRMED SYSTEMIC ICON-ALIGNMENT BUG (reference it; find ALL instances):
src/ui/primitives/v2/button.tsx wraps each icon in a View sized to spec.iconSize (e.g. scaled(16)=19 for md, scaled(20)=24 for lg), but then renders <Icon size={spec.iconSize}/> which internally re-applies scaledIcon() (ICON_SCALE=1.4) -> the SVG renders at scaledIcon(19)=27 (md) / scaledIcon(24)=34 (lg). A larger SVG anchored top-left in a smaller View overflows ~8-10px down-and-right, so the icon sits low-and-right of the text. ROOT CAUSE = the wrapper box is sized to the PRE-scaledIcon value while the icon renders POST-scaledIcon. The icon size itself is fine; the BOX is wrong (and/or the View lacks overflow-aware centering). Find every primitive/screen that boxes an icon in a fixed-size container sized to the same value it passes as the icon \`size\` prop (Button icon+iconRight, IconBtn, chips, rows, tab bar, field suffixes, stat tiles, etc.).
`;

const PALETTES = 'Tungsten, Mariner, Verdigris, Heliotype, Sandstone, Mercury';

const TODAY_OBS = `OWNER SCREENSHOT READ (current Today screen — you are blind to the render, use this): (1) the green "Synced" sync-chip in the header crowds/overlaps the OS status-bar icons (signal/wifi/battery) top-right; (2) the bell icon top-right sits very close to the status bar; (3) the "ON YOUR PLATE / Open work" section is a 2-col grid of large stat tiles (Open drafts "0 to finish", Awaiting signature "0 pending", plus a warning-triangle tile and a carabiner/gear tile that are CLIPPED off the bottom of the screen) — all showing 0; reads as low-value, wastes vertical space, bottom tiles cut off; (4) Quick Log card "No prior entry yet" with a disabled-looking "Same as last" + "View pending"; (5) Chain Head card "— — —". Owner: this section "could be more useful than what it's doing now." Flag the status-bar crowding, the clipped tiles, and the low-value empty grid specifically.`;

const PROFILE_OBS = `OWNER SCREENSHOT READ (Edit profile): the CONFIRMED icon-alignment bug is visible — the "+" in the "Add IRATA cert" outline button and the checklist icon in the "Save changes" footer button both render low-and-right of their text. Also a large empty vertical gap between "Add IRATA cert" and the footer on this short form (layout could fill/center better).`;

// ── Finder specs: 5 screen-groups (all 28 screens) + 5 cross-cutting ──
const FINDERS = [
  {
    key: 'today-records-shell',
    title: 'Today / Records / tab shell / splash',
    files: ['app/index.tsx', 'app/(tabs)/today.tsx', 'app/(tabs)/records.tsx', 'app/(tabs)/_layout.tsx', 'app/_layout.tsx'],
    extra: TODAY_OBS,
  },
  {
    key: 'gear',
    title: 'Gear list / detail / catalog',
    files: ['app/(tabs)/gear.tsx', 'app/gear/[id].tsx', 'app/gear/catalog.tsx'],
    extra: 'Owner separately wants a more information-dense gear layout — note density/clutter/empty-state issues but the redesign is handled by a design agent; focus on concrete defects here.',
  },
  {
    key: 'entry-flows',
    title: 'Entry: new wizard / detail / sign / edit / amend / request-signature',
    files: ['app/(tabs)/new.tsx', 'app/entry/new.tsx', 'app/entry/[id].tsx', 'app/entry/[id]/sign.tsx', 'app/entry/[id]/edit.tsx', 'app/entry/[id]/amend.tsx', 'app/entry/[id]/request-signature.tsx'],
    extra: 'These screens surface required-field readiness. Note WHERE/HOW missing fields are shown (top banner vs inline) — the inline-red redesign is handled by a design agent; here just record the current pattern + any defects.',
  },
  {
    key: 'profile-onboarding-more',
    title: 'Onboarding / Edit profile / More cluster (more, account, security, attachments)',
    files: ['app/(onboarding)/intro.tsx', 'app/(onboarding)/setup.tsx', 'app/profile-edit.tsx', 'app/(tabs)/more.tsx', 'app/account.tsx', 'app/security.tsx', 'app/attachments.tsx'],
    extra: PROFILE_OBS,
  },
  {
    key: 'verify-export-archive-hours',
    title: 'Verify portal / Export / Archives (index,new,detail) / Hours baseline',
    files: ['app/verify/[code].tsx', 'app/export.tsx', 'app/archives/index.tsx', 'app/archives/new.tsx', 'app/archives/[id].tsx', 'app/hours-baseline.tsx'],
    extra: 'Archives and hours-baseline are recent screens; the verify portal is opened by non-technician site signers (gloves/glare/unfamiliar) — weight clarity issues there.',
  },
  {
    key: 'cc-icon-alignment',
    title: 'CROSS-CUT: icon alignment / overflow / box-sizing (systemic)',
    files: ['ALL of src/ui/primitives/v2/*.tsx and ALL of app/**/*.tsx'],
    extra: ICON_ROOT_CAUSE + ' Glob/grep for icon usage and fixed-size wrapper Views. Trace the Button + IconBtn cases first (confirm), then sweep every other icon-in-fixed-box site. Each instance is a separate finding with file:line.',
  },
  {
    key: 'cc-iconography',
    title: 'CROSS-CUT: iconography quality (cloud + chain + duotone holdouts)',
    files: ['src/ui/icons/index.tsx', 'src/ui/icons/custom/*'],
    extra: 'Owner wants the CLOUD and CHAIN icons swapped for "something better". Assess: IconChain (still inline duotone in index.tsx), IconCloud/IconCloudAlt/IconCloudBackup (custom XML), and the remaining duotone holdouts (IconVerified, IconCalendar, IconLocation, IconWifi, IconOffline, IconChevron) which mix poorly with the bold currentColor set. For each weak icon: where it is used (grep), why it reads poorly (duotone vs solid, weight mismatch, clarity at small size), and a concrete replacement direction (which custom glyph / regen prompt). This is the iconography section of the report.',
  },
  {
    key: 'cc-token-type',
    title: 'CROSS-CUT: token & typography discipline',
    files: ['app/**/*.tsx', 'src/ui/primitives/v2/*.tsx'],
    extra: 'Grep for hardcoded hex colors (#RRGGBB) used where a token exists, raw fontSize/fontFamily/fontWeight instead of type.* (src/ui/theme/type.ts), and raw numeric spacing/sizes instead of spacing/scaled() tokens. Cite each. Mark typography-drift instances P3 + "known-class". Distinguish true violations from intentional local hex (see baseline 12% insets).',
  },
  {
    key: 'cc-contrast-palettes',
    title: 'CROSS-CUT: 6-palette contrast sweep',
    files: ['src/ui/theme/themes.ts', 'src/ui/theme/type.ts', 'app/**/*.tsx', 'src/ui/primitives/v2/*.tsx'],
    extra: `Read themes.ts (all 6 palettes: ${PALETTES}). Find foreground-on-background token pairs that fail contrast on ANY palette, and the soft-token-as-foreground class (e.g. okSoft/accentInk/*Soft used as a text/icon color over a saturated fill — these are pale-on-pale and vanish). Check each candidate against ALL 6 palettes' token tables, not just the default. The oxblood accent==danger collapse on Heliotype is INTENTIONAL (baseline) — do not report it.`,
  },
  {
    key: 'cc-primitives',
    title: 'CROSS-CUT: deep nitpick of the 29 v2 primitives',
    files: ['src/ui/primitives/v2/*.tsx'],
    extra: 'Read every primitive. Find internal defects: missing a11y props, hit-target <44px, non-reduced-motion animations, conditional transform:undefined (Fabric crash pattern), inconsistent padding/radius, props that silently do nothing. The icon-box bug is owned by cc-icon-alignment; focus on other primitive-internal issues here.',
  },
];

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          screen: { type: 'string', description: 'screen or component name' },
          file: { type: 'string' },
          line: { type: 'string', description: 'line or range, e.g. "150" or "150-162"' },
          category: { type: 'string', enum: ['alignment', 'spacing', 'sizing', 'overflow', 'contrast', 'color-token', 'typography', 'a11y', 'info-design', 'iconography', 'copy', 'interaction', 'state', 'other'] },
          severity: { type: 'string', enum: ['P1', 'P2', 'P3'] },
          basis: { type: 'string', enum: ['code-confirmed', 'visual-conjecture'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          description: { type: 'string' },
          proposed_fix: { type: 'string' },
        },
        required: ['title', 'screen', 'file', 'line', 'category', 'severity', 'basis', 'confidence', 'description', 'proposed_fix'],
      },
    },
  },
  required: ['findings'],
};

const VERIFIED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kept: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          screen: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'string' },
          category: { type: 'string' },
          severity: { type: 'string', enum: ['P1', 'P2', 'P3'] },
          basis: { type: 'string', enum: ['code-confirmed', 'visual-conjecture'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          description: { type: 'string' },
          proposed_fix: { type: 'string' },
          verifier_note: { type: 'string' },
        },
        required: ['title', 'screen', 'file', 'line', 'category', 'severity', 'basis', 'confidence', 'description', 'proposed_fix', 'verifier_note'],
      },
    },
    dropped_count: { type: 'number' },
  },
  required: ['kept'],
};

const DESIGN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    area: { type: 'string' },
    current_problem: { type: 'string' },
    data_available: { type: 'string', description: 'what data the screen actually has from its hooks/services to work with' },
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          summary: { type: 'string' },
          key_changes: { type: 'array', items: { type: 'string' } },
          tradeoffs: { type: 'string' },
          effort: { type: 'string', enum: ['S', 'M', 'L'] },
        },
        required: ['name', 'summary', 'key_changes', 'tradeoffs', 'effort'],
      },
    },
    recommendation: { type: 'string' },
  },
  required: ['area', 'current_problem', 'data_available', 'proposals', 'recommendation'],
};

function finderPrompt(spec) {
  return `You are auditing the RALB Codex Edition rope-access logbook UI (Expo / React Native, offline-first; field techs use it in gloves, in harnesses, in glare, one-handed). Repo root: ${ROOT}. Use Read with absolute paths under that root; use Glob/Grep to discover usages.

SCOPE for you (${spec.title}):
${spec.files.map((f) => '- ' + (f.includes('*') || f.startsWith('ALL') ? f : ROOT + '/' + f)).join('\n')}

Read every in-scope file FULLY (and grep for cross-references where useful). Find UI/UX DEFECTS across these dimensions: alignment, spacing, sizing, overflow/clipping, contrast, color-token misuse, typography (inline fontFamily/fontSize/fontWeight vs type.* in src/ui/theme/type.ts), a11y (missing accessibilityLabel/Role/State, <44px hit targets, reduced-motion), info-design (low-value / empty / cluttered / clipped sections), iconography, copy, interaction, and loading/error/empty state handling.

${spec.extra ? 'SCOPE-SPECIFIC GUIDANCE:\n' + spec.extra + '\n' : ''}
For EACH finding: cite exact file + line(s); set category; severity (P1 = broken/bug/clipped/unusable, P2 = notable, P3 = nitpick); BASIS — "code-confirmed" only if you can point to the exact code that causes the visual problem, else "visual-conjecture" (a "might look off / could be more consistent" guess without a definitive code cause); confidence; and a concrete proposed_fix that references tokens/primitives, not vague advice.

${BASELINE}

Be EXHAUSTIVE within your scope (this is an ultracode run — cost is no object) but PRECISE: do not pad with theoretical nits dressed up as bugs. Honestly tag basis + confidence so the synthesizer can tier them. Return ONLY the schema object.`;
}

function verifyPrompt(spec, res) {
  const findings = (res && res.findings) || [];
  return `Adversarially verify these UI audit findings for "${spec.title}" against the ACTUAL code at ${ROOT}. For each finding: OPEN the cited file:line and confirm the code genuinely exhibits the claimed problem.

DROP a finding if: (a) the code does not actually exhibit it (false positive / hallucinated), or (b) it is an INTENTIONAL design decision per the baseline below. Default to DROPPING a "code-confirmed" claim you cannot confirm at the cited location. Keep "visual-conjecture" items only if genuinely plausible; tag their confidence honestly (usually medium/low).

For survivors: correct severity / basis / confidence if the finder over- or under-rated, and add a one-line verifier_note stating what you confirmed at the file:line.

${BASELINE}

FINDINGS TO VERIFY (JSON):
${JSON.stringify(findings)}

Return {kept:[...survivors with verifier_note...], dropped_count:N}.`;
}

const DESIGN_TASKS = [
  {
    key: 'today-open-work',
    agentType: 'ux-visionary',
    prompt: `Redesign the "ON YOUR PLATE / Open work" section of the RALB Today screen. Repo root: ${ROOT}.
FIRST read the real implementation + data: ${ROOT}/app/(tabs)/today.tsx in full, then find and read the data layer it consumes (grep src/domain for today-derivations and any use-today / records-derivations / logbook + profile hooks). Propose ONLY things backed by data that ACTUALLY EXISTS in those hooks/services — no invented data.
${TODAY_OBS}
Constraints: offline-first; field techs in gloves/glare/one-handed; use the v2 primitives (src/ui/primitives/v2) + theme tokens (no hardcoded hex/sizes); must look acceptable on all 6 palettes (${PALETTES}). The current 2-col 0-count stat grid wastes space, clips its bottom tiles, and is low-value when empty.
Give 2-3 concrete redesign directions. For each: name, summary, key_changes (component-level, naming real primitives/tokens), tradeoffs, effort (S/M/L). End with a clear recommendation. Return ONLY the schema.`,
  },
  {
    key: 'gear-density',
    agentType: 'ui-visionary',
    prompt: `Redesign the RALB Gear section for a better-looking, more information-DENSE presentation. Repo root: ${ROOT}.
FIRST read the real implementation + data: ${ROOT}/app/(tabs)/gear.tsx, ${ROOT}/app/gear/[id].tsx, the gear primitives (${ROOT}/src/ui/primitives/v2/gear-card.tsx, ${ROOT}/src/ui/primitives/v2/countdown-dial.tsx), and the gear domain layer (${ROOT}/src/domain/gear/* — types, gear-service, use-gear). Propose only data that exists.
Owner: the gear list "could have a better looking, efficient method of showing the information." Today each item is a tall GearCard (icon plate + name + manufacturer/serial/category + inspection-state pill + progress bar). Consider density (more items per screen), at-a-glance inspection status (overdue/due-soon), and grouping/sorting.
Constraints: v2 primitives + tokens, 6 palettes, gloves/glare/one-handed. Give 2-3 directions; each with name, summary, key_changes (component-level), tradeoffs, effort. End with a recommendation. Return ONLY the schema.`,
  },
  {
    key: 'inline-field-validation',
    agentType: 'ux-visionary',
    prompt: `Design the pattern to surface MISSING REQUIRED FIELDS inline (highlight the offending field in red) instead of only a banner at the top of the screen. Repo root: ${ROOT}.
FIRST read: ${ROOT}/src/domain/logbook/entry-readiness.ts (the source of missingFields), ${ROOT}/src/ui/primitives/v2/field.tsx (it reportedly has an error prop), and the screens that currently show the top missing-fields banner: ${ROOT}/app/entry/[id]/sign.tsx, ${ROOT}/app/entry/new.tsx, ${ROOT}/app/entry/[id]/edit.tsx, ${ROOT}/app/entry/[id]/amend.tsx, ${ROOT}/app/entry/[id]/request-signature.tsx.
Owner: "missing field notifiers are at the top of the screen, I'd like for the missing field to be highlighted red instead."
Design the end-to-end pattern: how Field (and ChipSelect/date-field) render an error/required state on the right palettes (danger token, not hardcoded red; must read on all 6 palettes incl. Heliotype where danger==accent oxblood — use shape/label not just color); how readiness.missingFields maps to specific Field instances; whether to scroll-to / focus the first missing field on submit; whether to keep a compact summary or drop the banner entirely; a11y (accessibilityState, error announcement).
Give 2-3 directions; each name/summary/key_changes/tradeoffs/effort. End with a recommendation. Return ONLY the schema.`,
  },
];

function synthPrompt(allFindings, designs) {
  return `You are the synthesizer for a comprehensive UI nitpick audit of the RALB Codex Edition rope-access logbook. Below are (1) all VERIFIED findings from 10 finders (already adversarially checked against the code and the intentional baseline), and (2) design proposals for 3 owner-requested redesigns.

Produce a single, well-structured MARKDOWN report. Requirements:
- DEDUPLICATE findings that point at the same root cause or same file:line across finders (especially the systemic icon-alignment bug — collapse instances under one item that lists all affected sites).
- TIER the report so the few real defects are NOT buried under nits. Use these top-level sections, in order:
  1. "## Top defects (code-confirmed, fix these)" — P1/P2 with basis=code-confirmed, highest confidence first. Each: title, affected file:line(s), what's wrong, the fix. Number them D1, D2, ...
  2. "## Owner-requested items" — five subsections: (a) Icon-alignment fix (reference the systemic root cause + every affected site), (b) Cloud + chain icon swap (+ other weak icons), (c) Today "Open work" redesign, (d) Gear density redesign, (e) Inline-red missing-field validation. Fold the matching design-agent proposals in verbatim-ish (name/summary/key_changes/tradeoffs/effort + recommendation).
  3. "## Secondary findings" — remaining P2/P3 code-confirmed, grouped by screen/area.
  4. "## Nits & visual-conjecture (needs an on-device / screenshot pass)" — basis=visual-conjecture and low-confidence items, compact list. State plainly that pure-visual polish (exact spacing/look) was NOT verifiable by static code reading and needs a device pass.
  5. "## Counts" — totals by severity, by basis, and # affected files.
- For every concrete item keep the file:line citation so it's directly actionable.
- Be honest: if a "redesign" proposal depends on data that may not exist, flag it.

VERIFIED FINDINGS (JSON):
${JSON.stringify(allFindings)}

DESIGN PROPOSALS (JSON):
${JSON.stringify(designs)}

Output ONLY the markdown report (no preamble).`;
}

// ── Run ──────────────────────────────────────────────────────────────────
log(`Auditing ${FINDERS.length} finder scopes across all 28 screens + 29 primitives, plus 3 design proposals.`);

const [auditResults, designResults] = await Promise.all([
  pipeline(
    FINDERS,
    (spec) => agent(finderPrompt(spec), { label: `find:${spec.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA }),
    (res, spec) => agent(verifyPrompt(spec, res), { label: `verify:${spec.key}`, phase: 'Verify', schema: VERIFIED_SCHEMA }),
  ),
  parallel(
    DESIGN_TASKS.map((d) => () => agent(d.prompt, { label: `design:${d.key}`, phase: 'Design', schema: DESIGN_SCHEMA, agentType: d.agentType })),
  ),
]);

const allFindings = auditResults.filter(Boolean).flatMap((r) => (r && r.kept) || []);
const designs = designResults.filter(Boolean);
const topDefects = allFindings.filter((f) => f.basis === 'code-confirmed' && (f.severity === 'P1' || f.severity === 'P2'));

log(`Verified ${allFindings.length} findings (${topDefects.length} top code-confirmed defects); ${designs.length}/3 design proposals. Synthesizing.`);

const markdown = await agent(synthPrompt(allFindings, designs), { label: 'synthesize', phase: 'Synthesize' });

return {
  markdown,
  totalFindings: allFindings.length,
  topDefectCount: topDefects.length,
  designCount: designs.length,
};
