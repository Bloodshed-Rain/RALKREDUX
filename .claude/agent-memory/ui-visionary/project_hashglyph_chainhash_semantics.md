---
name: hashglyph-chainhash-semantics
description: EntryRow's chainHash prop is fed inconsistently across screens — Today passes the global chain head to all rows, Records passes entry.id; neither is the entry's real chain hash
metadata:
  type: project
---

`EntryRow` (src/ui/primitives/v2/entry-row.tsx) renders a `HashGlyph` keyed off its `chainHash` prop (first 8 hex chars → bar heights). Two list screens feed it differently:

- `app/(tabs)/today.tsx` line ~272: `chainHash={chainHead.data}` — the SAME global chain head for all 5 recent rows, so every glyph is identical, and it paints even on draft/pending rows that aren't in the chain.
- `app/(tabs)/records.tsx` line ~337: `chainHash={entry.id}` — the per-entry UUID (non-hex chars parse to 0, flattening bars).

Neither passes the entry's actual signature chain hash. Result: glyphs are decorative noise, not a real chain affordance, and the two screens disagree.

**Why:** HashGlyph is meant to communicate hash-chain identity at a glance (safety-critical immutability signal). Feeding it a constant or a UUID undermines that. A draft showing a chain glyph is semantically wrong.
**How to apply:** If asked to make the chain visualization meaningful, source a real per-entry `chain_hash` from the domain layer (request a hook field), only render the glyph for signed/amended rows, and use it consistently in both screens.
