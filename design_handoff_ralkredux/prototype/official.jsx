/* official.jsx — RALKREDUX, sanctioned aesthetic.
   Three wireframe directions in the visual language of a SPRAT/IRATA-grade
   regulated tool. All low-fi enough to still read as wireframes, but the
   composition, type, and rule-work signal "issued under standard".

   Shared system:
   - Type: Archivo (compressed display) + Inter (body) + IBM Plex Mono (data/IDs).
     Newsreader Italic only for stamps/seal marks.
   - Color: deep marine navy ink on regulated-document cream. Safety yellow
     for action/attention, signal red for danger/overdue, ledger green for
     verified. Rules are always hairline navy, never light gray.
   - Every screen has a document header (form #, revision, effective date)
     and a base footer (issued under, page x/y). Headers do the work that
     decorative containers usually do.
*/

const C = {
  ink:    '#0b2545',
  ink2:   '#1c3a64',
  ink3:   '#5a6a83',
  paper:  '#f6f3eb',
  paper2: '#efeae0',
  white:  '#ffffff',
  hair:   '#0b2545',
  hairSoft:'rgba(11,37,69,0.22)',
  hairFaint:'rgba(11,37,69,0.10)',
  yellow: '#f5c518',
  yellowDeep:'#c79a0a',
  yellowSoft:'#fbeec1',
  red:    '#b32f1a',
  redSoft:'#f6dad2',
  green:  '#1f7a3d',
  greenSoft:'#d2e5d4',
  teal:   '#0e6e7a',
};

const FD = "var(--fd, 'Archivo', 'Archivo Narrow', system-ui, sans-serif)"; // Display, compressed/strong
const FB = "var(--fb, 'Inter', system-ui, sans-serif)";                     // Body
const FM = "var(--fm, 'IBM Plex Mono', ui-monospace, monospace)";           // Monospace for IDs/numbers
const FS = "var(--fs, 'Newsreader', 'Times New Roman', serif)";             // Italic serif for stamps/sub-marks

// ── Building blocks ─────────────────────────────────────────────────────────

// Document head: form number, revision, effective date.
function DocHead({ form, rev, eff, title, sub, right }) {
  return (
    <div>
      <div style={{ background: C.ink, color: C.paper, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FM, fontSize: 9, letterSpacing: 1.1 }}>
        <span>{form} · REV {rev}</span>
        <span>EFF {eff}</span>
      </div>
      <div style={{ borderBottom: `1px solid ${C.hair}`, padding: '10px 12px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, background: C.paper }}>
        <div>
          <div style={{ fontFamily: FB, fontSize: 9, letterSpacing: 2.2, color: C.ink3, textTransform: 'uppercase' }}>{sub}</div>
          <div style={{ fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 22, color: C.ink, lineHeight: 1, marginTop: 2, letterSpacing: -0.2 }}>{title}</div>
        </div>
        {right}
      </div>
    </div>
  );
}

// Document foot: issued-under + page x/y.
function DocFoot({ page = '1/1', text = 'Issued under SPRAT v3.4 / IRATA ICOP Annex G recordkeeping clauses.' }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: `1px solid ${C.hair}`, background: C.paper2, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FM, fontSize: 8.5, letterSpacing: 0.9, color: C.ink2 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{text}</span>
      <span style={{ marginLeft: 8 }}>p. {page}</span>
    </div>
  );
}

// SPRAT/IRATA dual seal — abstracted, doesn't impersonate. Hexagon + circle.
function Seal({ size = 44, scheme = 'dual' }) {
  const isS = scheme === 'sprat' || scheme === 'dual';
  const isI = scheme === 'irata' || scheme === 'dual';
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 50 45">
      {/* hex */}
      <path d="M 12 4 L 38 4 L 48 22.5 L 38 41 L 12 41 L 2 22.5 Z" fill="none" stroke={C.ink} strokeWidth="1.6" />
      <path d="M 15 8 L 35 8 L 44 22.5 L 35 37 L 15 37 L 6 22.5 Z" fill="none" stroke={C.ink} strokeWidth="0.8" />
      {/* center mark */}
      {scheme === 'dual' && (
        <>
          <text x="25" y="20" textAnchor="middle" fontFamily={FD} fontWeight="900" fontSize="7.5" fill={C.ink} letterSpacing="0.5">SPRAT</text>
          <line x1="9" y1="23" x2="41" y2="23" stroke={C.ink} strokeWidth="0.6" />
          <text x="25" y="32" textAnchor="middle" fontFamily={FD} fontWeight="900" fontSize="7.5" fill={C.ink} letterSpacing="0.5">IRATA</text>
        </>
      )}
      {scheme === 'sprat' && <text x="25" y="27" textAnchor="middle" fontFamily={FD} fontWeight="900" fontSize="9" fill={C.ink}>SPRAT</text>}
      {scheme === 'irata' && <text x="25" y="27" textAnchor="middle" fontFamily={FD} fontWeight="900" fontSize="9" fill={C.ink}>IRATA</text>}
    </svg>
  );
}

// Field row — labeled value with field number, used in form-style screens.
function Field({ n, label, value, mono = true, fill, danger, empty }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.hairSoft}`, padding: '7px 0', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: FM, fontSize: 9, color: C.ink3, width: 22, letterSpacing: 0.5 }}>{n}</span>
      <span style={{ fontFamily: FB, fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: 1.5, width: 84 }}>{label}</span>
      <span style={{ flex: 1, fontFamily: mono ? FM : FB, fontSize: 13, color: empty ? C.red : (danger ? C.red : C.ink), fontStyle: empty ? 'italic' : 'normal', background: fill || 'transparent', padding: fill ? '2px 4px' : 0 }}>{value || (empty ? '— missing —' : '')}</span>
    </div>
  );
}

// Status chip — boxy, official.
function Chip({ tone = 'ink', children, solid }) {
  const map = {
    ink:   [C.ink,   C.paper],
    yellow:[C.yellowDeep, C.yellowSoft],
    red:   [C.red,   C.redSoft],
    green: [C.green, C.greenSoft],
    teal:  [C.teal,  '#cfe3e7'],
    mute:  [C.ink3,  C.paper2],
  };
  const [stroke, fill] = map[tone] || map.ink;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 7px',
      border: `1px solid ${stroke}`,
      background: solid ? stroke : fill,
      color: solid ? '#fff' : stroke,
      fontFamily: FB, fontSize: 9.5, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase',
    }}>{children}</span>
  );
}

// Stamp — rotated rubber-stamp.
function Stamp({ children, tone = 'green', rot = -6, big }) {
  const col = tone === 'green' ? C.green : tone === 'red' ? C.red : tone === 'yellow' ? C.yellowDeep : C.ink;
  return (
    <span style={{
      display: 'inline-block', transform: `rotate(${rot}deg)`,
      border: `2px solid ${col}`, color: col,
      padding: big ? '4px 10px' : '2px 8px',
      fontFamily: FS, fontStyle: 'italic', fontSize: big ? 18 : 13, fontWeight: 700,
      letterSpacing: 1.2, textTransform: 'uppercase',
    }}>{children}</span>
  );
}

// Bar progress — boxed.
function Bar({ value = 0.5, tone = C.ink, height = 8, showThreshold }) {
  return (
    <div style={{ position: 'relative', height, background: C.paper2, border: `1px solid ${C.hair}` }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: tone }} />
      {showThreshold ? <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${showThreshold * 100}%`, width: 1, background: C.red }} /> : null}
    </div>
  );
}

// KPI cell
function Kpi({ v, l, tone = C.ink, sub }) {
  return (
    <div style={{ border: `1px solid ${C.hair}`, padding: '8px 10px', background: C.white }}>
      <div style={{ fontFamily: FM, fontSize: 22, color: tone, lineHeight: 1, fontWeight: 600 }}>{v}</div>
      <div style={{ fontFamily: FB, fontSize: 9, color: C.ink3, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>{l}</div>
      {sub ? <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink2, marginTop: 2 }}>{sub}</div> : null}
    </div>
  );
}

// Section header — small caps with corner ticks.
function SectionH({ children, n, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14, marginBottom: 6, borderBottom: `1.5px solid ${C.ink}`, paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        {n ? <span style={{ fontFamily: FM, fontSize: 9, color: C.ink3 }}>§ {n}</span> : null}
        <span style={{ fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 13, color: C.ink, textTransform: 'uppercase', letterSpacing: 1.2 }}>{children}</span>
      </div>
      {right ? <span style={{ fontFamily: FM, fontSize: 9, color: C.ink3 }}>{right}</span> : null}
    </div>
  );
}

// Tabular row
function Row({ cols, head, em, danger }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols.map(c => c.w || '1fr').join(' '), gap: 6, padding: head ? '5px 4px' : '7px 4px', borderBottom: head ? `1.5px solid ${C.ink}` : `1px solid ${C.hairSoft}`, alignItems: 'center', background: em ? C.yellowSoft : 'transparent' }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          fontFamily: c.mono ? FM : (head ? FB : FB),
          fontSize: head ? 9 : (c.size || 11.5),
          color: head ? C.ink3 : (danger ? C.red : c.tone || C.ink),
          textTransform: head ? 'uppercase' : 'none',
          letterSpacing: head ? 1.5 : 0,
          fontWeight: head ? 600 : (c.bold ? 700 : 400),
          textAlign: c.align || 'left',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{c.v}</span>
      ))}
    </div>
  );
}

// Signature block — paired official sign.
function SignBlock({ name, role, date, id, status = 'verified' }) {
  const tone = status === 'verified' ? 'green' : status === 'pending' ? 'yellow' : 'red';
  const txt = status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Void';
  return (
    <div style={{ border: `1px solid ${C.hair}`, padding: '8px 10px', background: C.white, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: FB, fontSize: 9, letterSpacing: 1.5, color: C.ink3, textTransform: 'uppercase' }}>{role}</div>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: C.ink, marginTop: 2 }}>{name}</div>
          <div style={{ fontFamily: FM, fontSize: 10, color: C.ink2, marginTop: 2 }}>{id}</div>
        </div>
        <Stamp tone={tone}>{txt}</Stamp>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: FM, fontSize: 9, color: C.ink3 }}>
        <span>SIGNED {date}</span>
        <span>SHA·b820f3</span>
      </div>
    </div>
  );
}

// Tab bar — boxed segments at bottom.
function TabBar({ active = 0, labels = ['Logbook', 'Records', 'Gear', 'ID'] }) {
  return (
    <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, height: 44, borderTop: `1.5px solid ${C.ink}`, background: C.paper, display: 'flex' }}>
      {labels.map((l, i) => (
        <div key={l} style={{
          flex: 1,
          borderRight: i < labels.length - 1 ? `1px solid ${C.hairSoft}` : 'none',
          background: i === active ? C.ink : 'transparent',
          color: i === active ? C.paper : C.ink2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase',
        }}>{l}</div>
      ))}
    </div>
  );
}

// Phone frame — clinical, paper-like.
function Screen({ children, footer = true, foot, page }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      {children}
      {footer ? <DocFoot page={page} text={foot} /> : null}
    </div>
  );
}

// ── Direction D1 · ISO Form ─────────────────────────────────────────────────
// Pure regulated-document feel. Every screen is "Form 27 / Form 14 / etc."
// White inset blocks, navy hairlines, safety yellow only on action.

function D1_Dashboard() {
  return (
    <Screen page="1/4" foot="RALKREDUX·FORM-001 · Daily Operations Record">
      <DocHead form="FORM 27-A" rev="2.6" eff="01-MAY-2026"
        sub="Daily operations record"
        title="10 MAY 2026"
        right={<Seal size={42} />} />

      <div style={{ padding: '8px 12px 60px', height: 'calc(100% - 96px)', overflow: 'hidden' }}>
        {/* Operator strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, borderBottom: `1px solid ${C.hairSoft}` }}>
          <div style={{ width: 30, height: 30, background: C.ink, color: C.paper, fontFamily: FD, fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>JO</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: C.ink, lineHeight: 1 }}>ORTIZ, J.</div>
            <div style={{ fontFamily: FM, fontSize: 10, color: C.ink2 }}>OP-44021 · SPRAT II · IRATA L1</div>
          </div>
          <Chip tone="green">On duty</Chip>
        </div>

        {/* Primary CTA — yellow only action */}
        <button style={{ marginTop: 10, width: '100%', height: 52, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 17, letterSpacing: 1.5, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', cursor: 'pointer' }}>
          <span>Open new record</span>
          <span style={{ fontFamily: FM, fontSize: 14 }}>＋ §3</span>
        </button>

        <SectionH n="2" right="last 30 days">Tally</SectionH>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Kpi v="612" l="hrs signed" tone={C.ink} sub="+48 vs prior period" />
          <Kpi v="14" l="entries" tone={C.ink} sub="3 draft · 2 pending" />
        </div>

        <SectionH n="3" right="ANSI/ASSP Z459.1">Cert progress</SectionH>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: FM, fontSize: 10, color: C.ink2 }}>
          <span>SPRAT II → III</span><span>612 / 1000</span>
        </div>
        <Bar value={0.612} tone={C.ink} height={6} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: FM, fontSize: 10, color: C.ink2, marginTop: 6 }}>
          <span>IRATA L1 → L2</span><span>612 / 1000</span>
        </div>
        <Bar value={0.612} tone={C.ink} height={6} />

        <SectionH n="4" right="action required">Notices</SectionH>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 0', borderBottom: `1px solid ${C.hairSoft}` }}>
          <Chip tone="red" solid>OVER</Chip>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FB, fontSize: 12, color: C.ink, fontWeight: 600 }}>BEAL STATIC 10.5 — Inspection overdue 11d</div>
            <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>SN ROPE-001 · last insp. 04/29/26 · MUST CLEAR BEFORE NEXT DEPLOY</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 0' }}>
          <Chip tone="yellow" solid>PEND</Chip>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FB, fontSize: 12, color: C.ink, fontWeight: 600 }}>2 records awaiting verifier countersign</div>
            <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>K. BRIGGS · A. WEN · sent 02 days ago</div>
          </div>
        </div>
      </div>
      <TabBar active={0} />
    </Screen>
  );
}

function D1_Records() {
  const rows = [
    { d: '08-MAY', site: 'Pier 9, leg-3 insp.', hr: '8.5', s: 'OK', t: 'green' },
    { d: '06-MAY', site: 'WTG-14 blade root', hr: '7.0', s: 'PEN', t: 'yellow' },
    { d: '04-MAY', site: 'Stadium catwalk', hr: '4.5', s: 'DRF', t: 'mute' },
    { d: '28-APR', site: 'Refinery flare A-7', hr: '9.0', s: 'OK', t: 'green' },
    { d: '26-APR', site: 'Bridge B-7 anchor', hr: '6.5', s: 'AMD', t: 'teal' },
    { d: '22-APR', site: 'WTG-09 yaw deck', hr: '8.0', s: 'OK', t: 'green' },
    { d: '18-APR', site: 'Tower mast cable', hr: '5.5', s: 'OK', t: 'green' },
  ];
  return (
    <Screen page="2/4" foot="RALKREDUX·FORM-002 · Logged hours ledger">
      <DocHead form="FORM 14" rev="2.6" eff="01-MAY-2026"
        sub="Logged hours ledger"
        title="Records"
        right={<div style={{ textAlign: 'right' }}><div style={{ fontFamily: FM, fontSize: 9, color: C.ink3 }}>ENTRIES</div><div style={{ fontFamily: FM, fontSize: 16, color: C.ink, fontWeight: 600 }}>47</div></div>} />

      <div style={{ padding: '8px 12px 60px', height: 'calc(100% - 96px)', overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ border: `1px solid ${C.hair}`, background: C.white, padding: '6px 10px', fontFamily: FM, fontSize: 11, color: C.ink3, display: 'flex', justifyContent: 'space-between' }}>
          <span>⌕  site / client / task</span>
          <span style={{ fontFamily: FB, fontSize: 9, letterSpacing: 1.5, color: C.ink2 }}>FILTER ▾</span>
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          <Chip tone="ink" solid>All · 47</Chip>
          <Chip tone="green">OK · 42</Chip>
          <Chip tone="yellow">PEN · 2</Chip>
          <Chip tone="mute">DRF · 3</Chip>
        </div>

        <Row head cols={[
          { v: 'DATE', w: '52px' },
          { v: 'SITE / TASK' },
          { v: 'HR', w: '32px', align: 'right' },
          { v: 'STS', w: '40px', align: 'right' },
        ]} />
        {rows.map((r) => (
          <Row key={r.d + r.site} cols={[
            { v: r.d, w: '52px', mono: true, size: 10.5, tone: C.ink3 },
            { v: r.site, bold: true },
            { v: r.hr, w: '32px', align: 'right', mono: true, bold: true },
            { v: <Chip tone={r.t}>{r.s}</Chip>, w: '40px', align: 'right' },
          ]} />
        ))}

        <Row cols={[
          { v: 'TOTAL SHOWN', w: '52px' },
          { v: '', },
          { v: '48.5', w: '32px', align: 'right', mono: true, bold: true, size: 13 },
          { v: '', w: '40px' },
        ]} em />

        <SectionH n="6" right="signed records only">Export</SectionH>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {['.JSON', '.CSV', '.PDF'].map((x) => (
            <div key={x} style={{ border: `1px solid ${C.hair}`, background: C.white, padding: '8px 0', textAlign: 'center', fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.5 }}>{x}</div>
          ))}
        </div>
      </div>
      <TabBar active={1} />
    </Screen>
  );
}

function D1_NewEntry() {
  return (
    <Screen page="3/4" foot="RALKREDUX·FORM-003 · Entry of record">
      <DocHead form="FORM 03" rev="2.6" eff="01-MAY-2026"
        sub="Entry of record"
        title="New record"
        right={<Chip tone="yellow">Draft</Chip>} />

      <div style={{ padding: '8px 12px 60px', height: 'calc(100% - 96px)', overflow: 'hidden' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${C.hair}` }}>
          {['§1 Job', '§2 Detail', '§3 Sign'].map((s, i) => (
            <div key={s} style={{ flex: 1, padding: '5px 8px', background: i === 0 ? C.ink : 'transparent', color: i === 0 ? C.paper : C.ink2, borderRight: i < 2 ? `1px solid ${C.hair}` : 'none', fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' }}>{s}</div>
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <Field n="01a" label="Date from" value="2026-05-10" />
          <Field n="01b" label="Date to"   value="2026-05-10" />
          <Field n="02"  label="Site"      value="PIER 9 / LEG 3" />
          <Field n="03"  label="Client"    value="SKYLINE ROPE LLC" mono={false} />
          <Field n="04"  label="Task"      value="INSPECTION" />
          <Field n="05"  label="Access"    value="TWO-ROPE / SUSPENDED" />
          <Field n="06"  label="Height (m)" value="42.0" />
          <Field n="07"  label="Hours"     value="08.5" fill={C.yellowSoft} />
          <Field n="08"  label="Structure" value="" empty />
        </div>

        <SectionH n="9" right="required for sign-off">Gear deployed</SectionH>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Chip tone="green">✓ AVAO BOD</Chip>
          <Chip tone="green">✓ HTP 11mm</Chip>
          <Chip tone="green">✓ I'D S</Chip>
          <Chip tone="green">✓ VERTEX</Chip>
          <Chip tone="mute">＋ ADD</Chip>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button style={{ flex: 1, height: 38, border: `1.5px solid ${C.ink}`, background: C.white, color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>Save draft</button>
          <button style={{ flex: 1.4, height: 38, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>Continue → §2</button>
        </div>
      </div>
    </Screen>
  );
}

function D1_Gear() {
  const items = [
    { n: 'PETZL AVAO BOD', cat: 'HARNESS', sn: 'A8472',  due: '+42d',  s: 'OK',  t: 'green' },
    { n: 'BEAL STATIC 10.5', cat: 'ROPE 120m', sn: 'R-001', due: '−11d', s: 'OVR', t: 'red' },
    { n: 'STERLING HTP 11', cat: 'ROPE 200m', sn: 'R-004', due: '+118d', s: 'OK',  t: 'green' },
    { n: 'PETZL VERTEX',   cat: 'HELMET',  sn: 'H-2201', due: '—',    s: 'OK',  t: 'green' },
    { n: 'PETZL I\u2019D S',  cat: 'DESC.',  sn: 'D-9912', due: '+21d', s: 'SOON', t: 'yellow' },
    { n: 'CROLL L',        cat: 'ASCEND.', sn: 'C-771',  due: '+84d', s: 'OK',  t: 'green' },
  ];
  return (
    <Screen page="4/4" foot="RALKREDUX·FORM-009 · Equipment register">
      <DocHead form="FORM 09" rev="2.6" eff="01-MAY-2026"
        sub="Equipment register"
        title="Gear"
        right={<div style={{ display: 'flex', gap: 4 }}><Chip tone="red" solid>1</Chip><Chip tone="yellow" solid>1</Chip><Chip tone="green" solid>12</Chip></div>} />

      <div style={{ padding: '8px 12px 60px', height: 'calc(100% - 96px)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4 }}>
          <Kpi v="14" l="active" />
          <Kpi v="1" l="overdue" tone={C.red} />
          <Kpi v="1" l="due 30d" tone={C.yellowDeep} />
          <Kpi v="22" l="insp YTD" />
        </div>

        <SectionH n="10" right="sorted by due">Register</SectionH>
        <Row head cols={[
          { v: 'ITEM' },
          { v: 'SN',  w: '52px' },
          { v: 'DUE', w: '40px', align: 'right' },
          { v: 'STS', w: '38px', align: 'right' },
        ]} />
        {items.map((it) => (
          <Row key={it.n} cols={[
            {
              v: <div>
                <div style={{ fontFamily: FB, fontSize: 11.5, fontWeight: 600 }}>{it.n}</div>
                <div style={{ fontFamily: FM, fontSize: 9, color: C.ink3 }}>{it.cat}</div>
              </div>,
            },
            { v: it.sn, w: '52px', mono: true, size: 10, tone: C.ink3 },
            { v: it.due, w: '40px', mono: true, align: 'right', tone: it.t === 'red' ? C.red : it.t === 'yellow' ? C.yellowDeep : C.ink },
            { v: <Chip tone={it.t}>{it.s}</Chip>, w: '38px', align: 'right' },
          ]} />
        ))}

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button style={{ flex: 1, height: 36, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>＋ Add gear</button>
          <button style={{ flex: 1, height: 36, border: `1.5px solid ${C.ink}`, background: C.white, color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>✓ Log insp.</button>
        </div>
      </div>
      <TabBar active={2} />
    </Screen>
  );
}

function D1_Profile() {
  return (
    <Screen page="1/1" foot="RALKREDUX·FORM-000 · Operator identity card">
      <DocHead form="FORM 00" rev="2.6" eff="01-MAY-2026"
        sub="Operator identity"
        title="J. ORTIZ"
        right={<Seal size={44} />} />

      <div style={{ padding: '8px 12px 60px', height: 'calc(100% - 96px)', overflow: 'hidden' }}>
        {/* ID card */}
        <div style={{ border: `1.5px solid ${C.ink}`, background: C.white, padding: 10, display: 'flex', gap: 10 }}>
          <div style={{ width: 60, height: 76, background: C.paper2, border: `1px dashed ${C.hair}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 9, color: C.ink3 }}>PHOTO</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FM, fontSize: 9, color: C.ink3, letterSpacing: 1.5 }}>OPERATOR · OP-44021</div>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 17, color: C.ink, lineHeight: 1, marginTop: 2 }}>ORTIZ, JAMIE</div>
            <div style={{ fontFamily: FB, fontSize: 11, color: C.ink2, marginTop: 4 }}>SKYLINE ROPE LLC</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <Chip tone="ink" solid>SPRAT II</Chip>
              <Chip tone="ink" solid>IRATA L1</Chip>
            </div>
          </div>
        </div>
        {/* barcode-ish strip */}
        <div style={{ height: 18, background: `repeating-linear-gradient(to right, ${C.ink}, ${C.ink} 1.5px, transparent 1.5px, transparent 3px, ${C.ink} 3px, ${C.ink} 4px, transparent 4px, transparent 6px)`, borderLeft: `1.5px solid ${C.ink}`, borderRight: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }} />

        <SectionH n="A" right="see Form 27 for renewal">Credentials</SectionH>
        <Field n="A1" label="SPRAT id"  value="SP-2188-9402" />
        <Field n="A2" label="SPRAT lvl" value="II · expires 14-NOV-2027" mono={false} />
        <Field n="A3" label="IRATA id"  value="IR-44021" />
        <Field n="A4" label="IRATA lvl" value="1 · expires 01-AUG-2026" mono={false} />

        <SectionH n="B" right="encrypted">Backup</SectionH>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ flex: 1, height: 36, border: `1.5px solid ${C.ink}`, background: C.white, color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>↺ Restore</button>
          <button style={{ flex: 1, height: 36, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>↗ Snapshot</button>
        </div>
      </div>
      <TabBar active={3} />
    </Screen>
  );
}

// ── Direction D2 · Field Manual ─────────────────────────────────────────────
// More military/aviation manual: black bars, schematic strokes, orange-red
// signal accent rather than yellow. Heavier display type. Numbers dominate.

const C2 = { ...C, accent: '#e85a1f', accentSoft: '#fbe1d2' };

function D2_Header({ chap, ttl, sub }) {
  return (
    <div style={{ background: C.ink, color: C.paper, padding: '12px 14px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, height: 4, width: 90, background: C2.accent }} />
      <div style={{ fontFamily: FM, fontSize: 9, letterSpacing: 2, color: 'rgba(246,243,235,0.6)' }}>{chap}</div>
      <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 24, letterSpacing: -0.5, lineHeight: 1, marginTop: 2 }}>{ttl}</div>
      {sub ? <div style={{ fontFamily: FB, fontSize: 11, color: 'rgba(246,243,235,0.7)', marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

function D2_TabBar({ active = 0 }) {
  const labels = ['BRIEF', 'LOG', 'GEAR', 'CARD'];
  return (
    <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, height: 44, background: C.ink, display: 'flex' }}>
      {labels.map((l, i) => (
        <div key={l} style={{
          flex: 1,
          borderRight: i < labels.length - 1 ? `1px solid rgba(246,243,235,0.2)` : 'none',
          color: i === active ? C2.accent : 'rgba(246,243,235,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 12, letterSpacing: 2,
          borderTop: i === active ? `2px solid ${C2.accent}` : `2px solid transparent`,
        }}>{l}</div>
      ))}
    </div>
  );
}

function D2_Dashboard() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.1 · BRIEFING" ttl="DAY 130 / 365" sub="10 May 2026 · CLR · 12°C · W 7kt" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 80px)', overflow: 'hidden' }}>
        {/* Headline numeric */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: `1.5px solid ${C.ink}`, paddingBottom: 6 }}>
          <div>
            <div style={{ fontFamily: FB, fontSize: 9, letterSpacing: 1.8, color: C.ink3, textTransform: 'uppercase' }}>Cumulative rope hr</div>
            <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 52, color: C.ink, lineHeight: 0.85 }}>612<span style={{ fontSize: 22, color: C2.accent, marginLeft: 4 }}>.5</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FM, fontSize: 11, color: C.green, fontWeight: 600 }}>▲ +48 / 30d</div>
            <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>avg 6.4 hr/op-day</div>
          </div>
        </div>

        {/* Cert dial — orange accent */}
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <D2_Dial label="SPRAT" target="II → III" pct={0.612} v="612" t="1000" />
          <D2_Dial label="IRATA" target="L1 → L2"  pct={0.612} v="612" t="1000" />
        </div>

        {/* Critical advisory */}
        <div style={{ marginTop: 12, border: `1.5px solid ${C2.accent}`, background: C2.accentSoft }}>
          <div style={{ background: C2.accent, color: '#fff', padding: '4px 10px', fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 11, letterSpacing: 2, display: 'flex', justifyContent: 'space-between' }}>
            <span>⚠ ADVISORY · OPS-04</span>
            <span style={{ fontFamily: FM, fontSize: 10 }}>P1</span>
          </div>
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 14, color: C.ink }}>1× gear past inspection.</div>
            <div style={{ fontFamily: FM, fontSize: 10.5, color: C.ink2, marginTop: 2 }}>BEAL STATIC 10.5 · R-001 · −11d · DO NOT DEPLOY</div>
            <button style={{ marginTop: 6, padding: '4px 10px', border: `1.5px solid ${C.ink}`, background: '#fff', color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>Clear advisory →</button>
          </div>
        </div>

        {/* Action ladder */}
        <div style={{ marginTop: 12, fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 11, letterSpacing: 1.8, color: C.ink3, textTransform: 'uppercase' }}>Today's actions</div>
        <div style={{ borderTop: `1.5px solid ${C.ink}`, marginTop: 4 }}>
          {[
            { t: 'Open new record', s: '§3', em: true },
            { t: 'Countersign 2 pending', s: '§14' },
            { t: 'Inspect 1 item', s: '§09' },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.hairSoft}`, gap: 8 }}>
              <span style={{ width: 26, height: 26, background: a.em ? C2.accent : C.paper2, color: a.em ? '#fff' : C.ink2, border: `1.5px solid ${C.ink}`, fontFamily: FD, fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={{ flex: 1, fontFamily: FD, fontWeight: 700, fontSize: 14 }}>{a.t}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: C.ink3 }}>{a.s}</span>
              <span style={{ fontFamily: FD, fontSize: 16, color: C.ink2 }}>→</span>
            </div>
          ))}
        </div>
      </div>
      <D2_TabBar active={0} />
    </div>
  );
}

function D2_Dial({ label, target, pct, v, t }) {
  const r = 26, ci = 2 * Math.PI * r;
  return (
    <div style={{ border: `1.5px solid ${C.ink}`, padding: 8, background: C.white, display: 'flex', gap: 8, alignItems: 'center' }}>
      <svg width="62" height="62" viewBox="0 0 62 62">
        <circle cx="31" cy="31" r={r} fill="none" stroke={C.hairFaint} strokeWidth="6" />
        <circle cx="31" cy="31" r={r} fill="none" stroke={C2.accent} strokeWidth="6" strokeDasharray={ci} strokeDashoffset={ci * (1 - pct)} transform="rotate(-90 31 31)" strokeLinecap="butt" />
        <text x="31" y="35" textAnchor="middle" fontFamily={FM} fontSize="11" fontWeight="700" fill={C.ink}>{Math.round(pct * 100)}%</text>
      </svg>
      <div>
        <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 13, letterSpacing: 1.2 }}>{label}</div>
        <div style={{ fontFamily: FB, fontSize: 10, color: C.ink3 }}>{target}</div>
        <div style={{ fontFamily: FM, fontSize: 10, color: C.ink2, marginTop: 4 }}>{v}/{t}</div>
      </div>
    </div>
  );
}

function D2_Records() {
  const rows = [
    { d: '08·05', site: 'Pier 9, leg-3', cl: 'SKYLINE',   hr: '8.5', s: 'OK' },
    { d: '06·05', site: 'WTG-14 blade',  cl: 'NORTHWIND', hr: '7.0', s: 'PEN' },
    { d: '04·05', site: 'Stadium walk',  cl: 'CITYSPRTS', hr: '4.5', s: 'DRF' },
    { d: '28·04', site: 'Flare A-7',     cl: 'PETROCO',   hr: '9.0', s: 'OK' },
    { d: '26·04', site: 'Bridge B-7',    cl: 'DOT-NW',    hr: '6.5', s: 'AMD' },
    { d: '22·04', site: 'WTG-09 yaw',    cl: 'NORTHWIND', hr: '8.0', s: 'OK' },
  ];
  const tone = (s) => s === 'OK' ? C.green : s === 'PEN' ? C.yellowDeep : s === 'DRF' ? C.ink3 : C.teal;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.2 · LOG" ttl="LOG-2026" sub="47 entries · 612.5 cumulative hr" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 80px)', overflow: 'hidden' }}>
        {/* Range select */}
        <div style={{ display: 'flex', gap: 0, border: `1.5px solid ${C.ink}` }}>
          {['7D', '30D', '90D', 'YTD', 'ALL'].map((r, i) => (
            <div key={r} style={{ flex: 1, padding: '5px 0', textAlign: 'center', background: i === 1 ? C.ink : 'transparent', color: i === 1 ? C.paper : C.ink2, borderRight: i < 4 ? `1px solid ${C.hairSoft}` : 'none', fontFamily: FD, fontWeight: 800, fontSize: 10.5, letterSpacing: 1.5 }}>{r}</div>
          ))}
        </div>

        {/* Numeric summary */}
        <div style={{ display: 'flex', marginTop: 10, borderBottom: `1.5px solid ${C.ink}`, paddingBottom: 6, gap: 12 }}>
          <div><div style={{ fontFamily: FD, fontWeight: 900, fontSize: 22 }}>43.5<span style={{ fontFamily: FM, fontSize: 10, color: C.ink3, marginLeft: 4 }}>HR</span></div><div style={{ fontFamily: FM, fontSize: 9, color: C.ink3, letterSpacing: 1.5 }}>SHOWN</div></div>
          <div><div style={{ fontFamily: FD, fontWeight: 900, fontSize: 22 }}>06<span style={{ fontFamily: FM, fontSize: 10, color: C.ink3, marginLeft: 4 }}>DAYS</span></div><div style={{ fontFamily: FM, fontSize: 9, color: C.ink3, letterSpacing: 1.5 }}>ON ROPE</div></div>
          <div style={{ flex: 1, textAlign: 'right' }}><Chip tone="ink" solid>+ ADD</Chip></div>
        </div>

        {/* List */}
        <Row head cols={[
          { v: 'DATE', w: '46px' },
          { v: 'SITE · CLIENT' },
          { v: 'HR', w: '32px', align: 'right' },
          { v: 'STS', w: '38px', align: 'right' },
        ]} />
        {rows.map((r) => (
          <Row key={r.d + r.site} cols={[
            { v: r.d, w: '46px', mono: true, size: 10, tone: C.ink3 },
            { v: <div>
              <div style={{ fontFamily: FB, fontSize: 12, fontWeight: 600 }}>{r.site}</div>
              <div style={{ fontFamily: FM, fontSize: 9, color: C.ink3 }}>{r.cl}</div>
            </div> },
            { v: r.hr, w: '32px', align: 'right', mono: true, bold: true, size: 13 },
            { v: <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 10, color: tone(r.s), letterSpacing: 1.5 }}>{r.s}</span>, w: '38px', align: 'right' },
          ]} />
        ))}

        {/* Export */}
        <div style={{ marginTop: 10, fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>EXPORT: <span style={{ color: C2.accent, fontWeight: 700 }}>JSON</span> · <span style={{ color: C2.accent, fontWeight: 700 }}>CSV</span> · <span style={{ color: C2.accent, fontWeight: 700 }}>PDF (audit)</span></div>
      </div>
      <D2_TabBar active={1} />
    </div>
  );
}

function D2_Gear() {
  const items = [
    { n: 'PETZL AVAO BOD',    cat: 'HARN', sn: 'A8472', due: 42,  s: 'OK', icon: 'H' },
    { n: 'BEAL STATIC 10.5',  cat: 'ROPE', sn: 'R-001', due: -11, s: 'OVR',icon: 'R' },
    { n: 'STERLING HTP 11',   cat: 'ROPE', sn: 'R-004', due: 118, s: 'OK', icon: 'R' },
    { n: 'PETZL VERTEX',      cat: 'HEAD', sn: 'H-2201',due: null,s: 'OK', icon: 'V' },
    { n: 'PETZL I\u2019D S',     cat: 'DESC', sn: 'D-9912',due: 21, s: 'SOON',icon: 'D' },
    { n: 'CROLL L',           cat: 'ASC',  sn: 'C-771', due: 84,  s: 'OK', icon: 'A' },
  ];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.3 · GEAR" ttl="EQUIPMENT" sub="14 active · 1 overdue · 22 insp YTD" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 80px)', overflow: 'hidden' }}>
        {/* Schematic timeline */}
        <div style={{ fontFamily: FM, fontSize: 9, color: C.ink3, letterSpacing: 1.5 }}>NEXT INSPECTIONS · 90D</div>
        <div style={{ position: 'relative', height: 36, marginTop: 4, borderTop: `1.5px solid ${C.ink}`, borderBottom: `1.5px solid ${C.ink}` }}>
          {/* tick grid */}
          {[0, 25, 50, 75, 100].map((p) => (
            <div key={p} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: C.hairSoft }} />
          ))}
          {/* now line */}
          <div style={{ position: 'absolute', left: '11%', top: -4, bottom: -4, width: 2, background: C2.accent }} />
          {/* events */}
          {[
            { p: 0, t: 'R-001', tone: C.red, dx: -8 },
            { p: 22, t: 'D-9912', tone: C.yellowDeep, dx: 0 },
            { p: 46, t: 'A8472', tone: C.green, dx: 0 },
            { p: 92, t: 'C-771', tone: C.green, dx: -14 },
          ].map((e, i) => (
            <div key={i} style={{ position: 'absolute', left: `calc(${e.p}% + ${e.dx}px)`, top: -3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, background: e.tone, border: `1.5px solid ${C.ink}` }} />
              <span style={{ fontFamily: FM, fontSize: 8.5, color: e.tone, marginTop: 12, whiteSpace: 'nowrap', fontWeight: 700 }}>{e.t}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FM, fontSize: 8.5, color: C.ink3, marginTop: 16 }}>
          <span>NOW</span><span>+22D</span><span>+45D</span><span>+67D</span><span>+90D</span>
        </div>

        {/* List */}
        <div style={{ marginTop: 10, borderTop: `1.5px solid ${C.ink}` }}>
          {items.map((it) => {
            const tone = it.due === null ? C.ink3 : it.due < 0 ? C.red : it.due < 30 ? C.yellowDeep : C.green;
            const dueTxt = it.due === null ? '——' : it.due < 0 ? `${it.due}d` : `+${it.due}d`;
            return (
              <div key={it.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: `1px solid ${C.hairSoft}` }}>
                <div style={{ width: 28, height: 28, background: C.ink, color: C.paper, fontFamily: FD, fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FB, fontSize: 12, fontWeight: 600 }}>{it.n}</div>
                  <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>{it.cat} · SN {it.sn}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: FM, fontSize: 12, color: tone, fontWeight: 700 }}>{dueTxt}</div>
                  <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 9, color: tone, letterSpacing: 1.5 }}>{it.s}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <D2_TabBar active={2} />
    </div>
  );
}

function D2_NewEntry() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.1 · BRIEFING" ttl="NEW ENTRY" sub="Step 1 of 3 · Job particulars" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 80px)', overflow: 'hidden' }}>
        {/* Big hours stepper */}
        <div style={{ border: `1.5px solid ${C.ink}`, background: C.white, padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: FB, fontSize: 9, color: C.ink3, letterSpacing: 1.5 }}>HOURS ON ROPE</span>
            <span style={{ fontFamily: FM, fontSize: 9, color: C.ink3 }}>FIELD 07</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 4 }}>
            <button style={{ width: 36, height: 36, border: `1.5px solid ${C.ink}`, background: C.white, fontFamily: FD, fontSize: 22, fontWeight: 900 }}>−</button>
            <span style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 56, color: C.ink, lineHeight: 0.9 }}>08<span style={{ color: C2.accent }}>.5</span></span>
            <button style={{ width: 36, height: 36, border: `1.5px solid ${C.ink}`, background: C2.accent, color: '#fff', fontFamily: FD, fontSize: 22, fontWeight: 900 }}>＋</button>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <Field n="01" label="Date"      value="2026-05-10" />
          <Field n="02" label="Site"      value="PIER 9 / LEG 3" />
          <Field n="03" label="Client"    value="SKYLINE ROPE LLC" mono={false} />
          <Field n="04" label="Task"      value="INSPECTION" />
          <Field n="05" label="Access"    value="TWO-ROPE / SUSP" />
          <Field n="06" label="Structure" value="" empty />
        </div>

        <div style={{ marginTop: 10, fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 11, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' }}>Quick gear</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {['AVAO','HTP-11','VERTEX','I’D S','CROLL','+'].map((g, i) => (
            <span key={g} style={{ padding: '3px 8px', border: `1.5px solid ${C.ink}`, background: i < 5 ? C.ink : 'transparent', color: i < 5 ? C.paper : C.ink, fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.2 }}>{g}</span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button style={{ flex: 1, height: 40, border: `1.5px solid ${C.ink}`, background: C.white, color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>Save draft</button>
          <button style={{ flex: 1.4, height: 40, border: `1.5px solid ${C.ink}`, background: C2.accent, color: '#fff', fontFamily: FD, fontWeight: 900, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>Sign + lock</button>
        </div>
      </div>
    </div>
  );
}

function D2_Profile() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.4 · CARD" ttl="OPERATOR" sub="OP-44021 · Skyline Rope LLC" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 80px)', overflow: 'hidden' }}>
        {/* Big credential card */}
        <div style={{ border: `1.5px solid ${C.ink}`, background: C.ink, color: C.paper, padding: 12, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, height: 4, width: 60, background: C2.accent }} />
          <div style={{ fontFamily: FM, fontSize: 9, color: 'rgba(246,243,235,0.55)', letterSpacing: 1.8 }}>ROPE ACCESS · OPERATOR CARD</div>
          <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 26, lineHeight: 1, marginTop: 4 }}>ORTIZ, J.</div>
          <div style={{ fontFamily: FM, fontSize: 10.5, color: 'rgba(246,243,235,0.7)', marginTop: 4 }}>OP-44021 · ISSUED 2019</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span style={{ padding: '3px 7px', border: `1.5px solid ${C2.accent}`, color: C2.accent, fontFamily: FD, fontWeight: 900, fontSize: 11, letterSpacing: 1.5 }}>SPRAT II</span>
            <span style={{ padding: '3px 7px', border: `1.5px solid ${C2.accent}`, color: C2.accent, fontFamily: FD, fontWeight: 900, fontSize: 11, letterSpacing: 1.5 }}>IRATA L1</span>
          </div>
          <div style={{ marginTop: 10, fontFamily: FM, fontSize: 9.5, color: 'rgba(246,243,235,0.55)' }}>chain head · 3f9a1c…b820</div>
        </div>

        {/* Cert ladder */}
        <div style={{ marginTop: 10, fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 11, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' }}>Progress to next level</div>
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FM, fontSize: 10, color: C.ink2 }}><span>SPRAT II → III</span><span>612 / 1000 (61%)</span></div>
          <Bar value={0.612} tone={C2.accent} height={10} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FM, fontSize: 10, color: C.ink2, marginTop: 8 }}><span>IRATA L1 → L2</span><span>612 / 1000 (61%)</span></div>
          <Bar value={0.612} tone={C2.accent} height={10} />
        </div>

        {/* Verifiers */}
        <div style={{ marginTop: 12, fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 11, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' }}>Counter-signing officers</div>
        <div style={{ borderTop: `1.5px solid ${C.ink}`, marginTop: 4 }}>
          {[
            { n: 'K. BRIGGS', r: 'IRATA L3 Assessor', id: 'IR-30219', sg: 5 },
            { n: 'A. WEN',    r: 'SPRAT Evaluator',   id: 'SP-1124-7700', sg: 12 },
            { n: 'M. HALSE',  r: 'IRATA L3',          id: 'IR-29904', sg: 3 },
          ].map((v) => (
            <div key={v.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.hairSoft}` }}>
              <div style={{ width: 26, height: 26, background: C.paper2, border: `1.5px solid ${C.ink}`, fontFamily: FD, fontWeight: 900, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.n.split(' ').map(s => s[0]).join('')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 12 }}>{v.n}</div>
                <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>{v.r} · {v.id}</div>
              </div>
              <span style={{ fontFamily: FM, fontSize: 11, color: C.ink2 }}>{v.sg} sg</span>
            </div>
          ))}
        </div>
      </div>
      <D2_TabBar active={3} />
    </div>
  );
}

// ── Direction D3 · Compliance Card ──────────────────────────────────────────
// Most "credential-forward". Each screen reads like a digital ID page. Heavy
// header band with seal + photo. Big "CERTIFIED · SINCE 2019" tone. Yellow
// hairline accents, paper warmth. Each screen has a watermark seal.

function D3_Watermark({ children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04 }}>
      {children}
    </div>
  );
}

function D3_Header({ ttl, sub, idn }) {
  return (
    <div style={{ background: C.ink, color: C.paper, position: 'relative' }}>
      {/* Yellow guilloche pattern */}
      <div style={{ height: 6, background: `repeating-linear-gradient(45deg, ${C.yellow}, ${C.yellow} 4px, ${C.ink} 4px, ${C.ink} 8px)` }} />
      <div style={{ padding: '12px 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontFamily: FS, fontStyle: 'italic', fontSize: 11, color: C.yellow, letterSpacing: 1.5 }}>Rope Access Log Book</div>
          <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 22, lineHeight: 1, marginTop: 2 }}>{ttl}</div>
          {sub ? <div style={{ fontFamily: FB, fontSize: 11, color: 'rgba(246,243,235,0.7)', marginTop: 4 }}>{sub}</div> : null}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: FM, fontSize: 8.5, color: 'rgba(246,243,235,0.55)', letterSpacing: 1.5 }}>OP-ID</div>
          <div style={{ fontFamily: FM, fontSize: 12, color: C.paper }}>{idn}</div>
        </div>
      </div>
      <div style={{ height: 6, background: `repeating-linear-gradient(-45deg, ${C.yellow}, ${C.yellow} 4px, ${C.ink} 4px, ${C.ink} 8px)` }} />
    </div>
  );
}

function D3_TabBar({ active = 0 }) {
  const labels = ['Today', 'Records', 'Gear', 'Card'];
  return (
    <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, background: C.paper, borderTop: `1px solid ${C.hair}` }}>
      <div style={{ height: 3, background: C.yellow }} />
      <div style={{ display: 'flex', height: 44 }}>
        {labels.map((l, i) => (
          <div key={l} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: i === active ? C.ink : C.ink3,
            fontFamily: FD, fontWeight: i === active ? 900 : 700, fontStretch: '85%', fontSize: 12, letterSpacing: 1.5,
            borderRight: i < 3 ? `1px solid ${C.hairSoft}` : 'none',
            position: 'relative',
          }}>
            {l}
            {i === active ? <div style={{ position: 'absolute', top: -3, left: '20%', right: '20%', height: 3, background: C.ink }} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function D3_Dashboard() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D3_Watermark><Seal size={260} /></D3_Watermark>
      <D3_Header ttl="Today" sub="10 May 2026 · 130 / 365" idn="OP-44021" />

      <div style={{ padding: '12px 14px 64px', height: 'calc(100% - 92px)', overflow: 'hidden', position: 'relative' }}>
        {/* Credential strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: `1px solid ${C.hairSoft}` }}>
          <div style={{ width: 44, height: 44, background: C.paper2, border: `1.5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FD, fontWeight: 900, fontSize: 16 }}>JO</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>Jamie Ortiz</div>
            <div style={{ fontFamily: FM, fontSize: 10, color: C.ink3, marginTop: 2 }}>SPRAT II · IRATA L1 · since 2019</div>
          </div>
          <Stamp tone="green" rot={-4} big>Active</Stamp>
        </div>

        {/* Big logged hours */}
        <div style={{ marginTop: 10, padding: '8px 0', borderBottom: `1px solid ${C.hairSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <span style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 56, lineHeight: 0.85 }}>612.5</span>
            <div style={{ paddingBottom: 4 }}>
              <div style={{ fontFamily: FB, fontSize: 10, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' }}>Hours certified</div>
              <div style={{ fontFamily: FM, fontSize: 11, color: C.green, fontWeight: 700 }}>+48 last 30 days</div>
            </div>
          </div>
        </div>

        {/* Cert dual */}
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <D3_CertCard scheme="SPRAT" lvl="II" target="III" pct={0.612} exp="14·NOV·2027" />
          <D3_CertCard scheme="IRATA" lvl="L1" target="L2" pct={0.612} exp="01·AUG·2026" warn />
        </div>

        {/* Today's task */}
        <SectionH n="Today">Open items</SectionH>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.hairSoft}`, gap: 6 }}>
          <Stamp tone="red" rot={-3}>Over</Stamp>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 13 }}>Inspect Beal Static 10.5</div>
            <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>R-001 · overdue 11d</div>
          </div>
          <span style={{ fontFamily: FD, fontSize: 18, color: C.ink3 }}>→</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.hairSoft}`, gap: 6 }}>
          <Stamp tone="yellow" rot={-3}>Pend</Stamp>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 13 }}>Counter-sign K. Briggs, A. Wen</div>
            <div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3 }}>2 records · 2d ago</div>
          </div>
          <span style={{ fontFamily: FD, fontSize: 18, color: C.ink3 }}>→</span>
        </div>

        {/* CTA at bottom */}
        <button style={{ marginTop: 10, width: '100%', height: 46, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontSize: 14, letterSpacing: 1.8, textTransform: 'uppercase' }}>＋ New record</button>
      </div>
      <D3_TabBar active={0} />
    </div>
  );
}

function D3_CertCard({ scheme, lvl, target, pct, exp, warn }) {
  return (
    <div style={{ border: `1.5px solid ${C.ink}`, padding: 8, background: C.white, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: warn ? C.red : C.yellow }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
        <span style={{ fontFamily: FS, fontStyle: 'italic', fontWeight: 700, fontSize: 12 }}>{scheme}</span>
        <span style={{ fontFamily: FM, fontSize: 9, color: C.ink3 }}>exp {exp}</span>
      </div>
      <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 26, color: C.ink, lineHeight: 1, marginTop: 2 }}>{lvl}</div>
      <div style={{ marginTop: 6 }}>
        <Bar value={pct} tone={C.ink} height={5} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FM, fontSize: 9, color: C.ink3, marginTop: 2 }}>
          <span>→ {target}</span><span>{Math.round(pct * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function D3_Records() {
  const groups = [
    { m: 'MAY 2026', total: '20.0', rows: [
      { d: '08', site: 'Pier 9, leg-3 inspection', hr: '8.5', s: 'verified' },
      { d: '06', site: 'WTG-14 blade root',        hr: '7.0', s: 'pending' },
      { d: '04', site: 'Stadium catwalk',          hr: '4.5', s: 'draft' },
    ]},
    { m: 'APR 2026', total: '128.5', rows: [
      { d: '28', site: 'Refinery flare A-7',       hr: '9.0', s: 'verified' },
      { d: '26', site: 'Bridge B-7 anchor pull',   hr: '6.5', s: 'amended' },
      { d: '22', site: 'WTG-09 yaw deck',          hr: '8.0', s: 'verified' },
    ]},
  ];
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D3_Watermark><Seal size={260} /></D3_Watermark>
      <D3_Header ttl="Records" sub="47 entries · 612.5 hr verified" idn="OP-44021" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 92px)', overflow: 'hidden' }}>
        {/* Filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Chip tone="ink" solid>All · 47</Chip>
          <Chip tone="green">Verified · 42</Chip>
          <Chip tone="yellow">Pending · 2</Chip>
          <Chip tone="mute">Draft · 3</Chip>
        </div>

        {groups.map((g) => (
          <div key={g.m} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `1.5px solid ${C.ink}` }}>
              <span style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 14, letterSpacing: 1.5 }}>{g.m}</span>
              <span style={{ fontFamily: FM, fontSize: 11, color: C.ink2 }}>{g.total} hr</span>
            </div>
            {g.rows.map((r) => {
              const t = r.s === 'verified' ? 'green' : r.s === 'pending' ? 'yellow' : r.s === 'amended' ? 'teal' : 'mute';
              return (
                <div key={r.d + r.site} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.hairSoft}` }}>
                  <span style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 18, color: C.ink, width: 24 }}>{r.d}</span>
                  <span style={{ flex: 1, fontFamily: FB, fontSize: 12.5, fontWeight: 500 }}>{r.site}</span>
                  <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 600 }}>{r.hr}<span style={{ fontSize: 9, color: C.ink3, marginLeft: 2 }}>hr</span></span>
                  <Chip tone={t}>{r.s.slice(0, 3)}</Chip>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <D3_TabBar active={1} />
    </div>
  );
}

function D3_NewEntry() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D3_Watermark><Seal size={260} /></D3_Watermark>
      <D3_Header ttl="New record" sub="Step 1 of 3 · Particulars" idn="OP-44021" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 92px)', overflow: 'hidden' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {['Particulars','Detail','Sign'].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 22, height: 22, background: i === 0 ? C.ink : C.paper2, color: i === 0 ? C.paper : C.ink2, border: `1.5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FD, fontWeight: 900, fontSize: 11 }}>{i + 1}</span>
                <span style={{ fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 11, color: i === 0 ? C.ink : C.ink3, letterSpacing: 1.2, textTransform: 'uppercase' }}>{s}</span>
              </div>
              {i < 2 ? <div style={{ flex: 1, height: 1.5, background: C.hairSoft, margin: '0 6px' }} /> : null}
            </React.Fragment>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <Field n="01" label="Date"      value="2026-05-10" />
          <Field n="02" label="Site"      value="PIER 9 / LEG 3" />
          <Field n="03" label="Client"    value="SKYLINE ROPE LLC" mono={false} />
          <Field n="04" label="Task"      value="INSPECTION" />
          <Field n="05" label="Access"    value="TWO-ROPE / SUSPENDED" />
          <Field n="06" label="Hours"     value="08.5" fill={C.yellowSoft} />
          <Field n="07" label="Height"    value="42.0 m" />
          <Field n="08" label="Structure" value="" empty />
        </div>

        <SectionH n="Notes">Work performed</SectionH>
        <div style={{ border: `1px solid ${C.hair}`, background: C.white, padding: 8, fontFamily: FB, fontSize: 11.5, color: C.ink2, minHeight: 50, lineHeight: 1.4 }}>
          Cleaned tide marks on leg 3, photographed anode wear at lower zone, no structural defects observed. <span style={{ color: C.ink3, fontStyle: 'italic' }}>cursor</span>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button style={{ flex: 1, height: 40, border: `1.5px solid ${C.ink}`, background: '#fff', color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>Save draft</button>
          <button style={{ flex: 1.3, height: 40, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>Continue →</button>
        </div>
      </div>
    </div>
  );
}

function D3_Gear() {
  const items = [
    { n: 'Petzl Avao Bod',    cat: 'Harness',     sn: 'A8472',  due: '+42d', s: 'ok' },
    { n: 'Beal Static 10.5',  cat: 'Rope · 120m', sn: 'R-001',  due: '−11d', s: 'over' },
    { n: 'Sterling HTP 11',   cat: 'Rope · 200m', sn: 'R-004',  due: '+118d',s: 'ok' },
    { n: 'Petzl Vertex',      cat: 'Helmet',      sn: 'H-2201', due: '—',    s: 'ok' },
    { n: 'Petzl I’D S',       cat: 'Descender',   sn: 'D-9912', due: '+21d', s: 'soon' },
    { n: 'Croll L',           cat: 'Ascender',    sn: 'C-771',  due: '+84d', s: 'ok' },
  ];
  const tone = (s) => s === 'over' ? 'red' : s === 'soon' ? 'yellow' : 'green';
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D3_Watermark><Seal size={260} /></D3_Watermark>
      <D3_Header ttl="Gear register" sub="14 active · 1 overdue · 1 due soon" idn="OP-44021" />

      <div style={{ padding: '10px 14px 64px', height: 'calc(100% - 92px)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <Kpi v="14" l="active" />
          <Kpi v="1" l="overdue" tone={C.red} />
          <Kpi v="22" l="insp YTD" />
        </div>

        <SectionH n="Register" right="sorted by due">All gear</SectionH>
        {items.map((it) => (
          <div key={it.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.hairSoft}` }}>
            <div style={{ width: 34, height: 34, background: C.paper2, border: `1.5px solid ${C.ink}`, fontFamily: FS, fontStyle: 'italic', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.cat[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 13 }}>{it.n}</div>
              <div style={{ fontFamily: FM, fontSize: 10, color: C.ink3 }}>{it.cat} · SN {it.sn}</div>
            </div>
            <Chip tone={tone(it.s)}>{it.due}</Chip>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          <button style={{ flex: 1, height: 40, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>＋ Add gear</button>
          <button style={{ flex: 1, height: 40, border: `1.5px solid ${C.ink}`, background: '#fff', color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>✓ Inspect</button>
        </div>
      </div>
      <D3_TabBar active={2} />
    </div>
  );
}

function D3_Profile() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D3_Watermark><Seal size={300} /></D3_Watermark>
      <D3_Header ttl="Operator card" sub="Issued under SPRAT v3.4 / IRATA ICOP" idn="OP-44021" />

      <div style={{ padding: '12px 14px 64px', height: 'calc(100% - 92px)', overflow: 'hidden', position: 'relative' }}>
        {/* Big card */}
        <div style={{ border: `2px solid ${C.ink}`, background: C.white, padding: 12, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 6, right: 6 }}><Seal size={36} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 64, height: 80, background: C.paper2, border: `1.5px solid ${C.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 9, color: C.ink3 }}>PHOTO</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FS, fontStyle: 'italic', fontSize: 11, color: C.ink3 }}>Certified operator since 2019</div>
              <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 22, color: C.ink, lineHeight: 1, marginTop: 4 }}>Jamie Ortiz</div>
              <div style={{ fontFamily: FB, fontSize: 11, color: C.ink2, marginTop: 4 }}>Skyline Rope LLC</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                <Chip tone="ink" solid>SPRAT II</Chip>
                <Chip tone="ink" solid>IRATA L1</Chip>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${C.hair}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontFamily: FM, fontSize: 10 }}>
            <span style={{ color: C.ink3 }}>SPRAT id</span><span style={{ textAlign: 'right' }}>SP-2188-9402</span>
            <span style={{ color: C.ink3 }}>IRATA id</span><span style={{ textAlign: 'right' }}>IR-44021</span>
            <span style={{ color: C.ink3 }}>Chain</span><span style={{ textAlign: 'right' }}>3f9a1c…b820</span>
            <span style={{ color: C.ink3 }}>Records</span><span style={{ textAlign: 'right' }}>47 / 612.5 hr</span>
          </div>
        </div>

        {/* Signature block */}
        <SectionH n="Last counter-sign">Most recent</SectionH>
        <SignBlock name="K. Briggs" role="IRATA L3 Assessor" id="IR-30219" date="2026-05-09 18:12" status="verified" />

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button style={{ flex: 1, height: 38, border: `1.5px solid ${C.ink}`, background: '#fff', color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>↺ Restore</button>
          <button style={{ flex: 1, height: 38, border: `1.5px solid ${C.ink}`, background: C.yellow, color: C.ink, fontFamily: FD, fontWeight: 900, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>↗ Snapshot</button>
        </div>
      </div>
      <D3_TabBar active={3} />
    </div>
  );
}

// ── Compose canvas ──────────────────────────────────────────────────────────

const PHONE_W = 320;
const PHONE_H = 640;

function Wireframes() {
  return (
    <DesignCanvas>
      <DCSection id="intro" title="RALKREDUX · sanctioned aesthetic" subtitle="Three directions in the visual language of an officially-issued SPRAT/IRATA tool.">
        <DCArtboard id="legend" label="Legend" width={360} height={520}>
          <div style={{ padding: 18, fontFamily: FB, fontSize: 13, color: C.ink, background: C.paper, height: '100%', boxSizing: 'border-box', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `repeating-linear-gradient(45deg, ${C.yellow}, ${C.yellow} 6px, ${C.ink} 6px, ${C.ink} 12px)` }} />
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontFamily: FS, fontStyle: 'italic', fontSize: 14, color: C.ink2 }}>What changed</div>
              <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 26, lineHeight: 1, color: C.ink, marginTop: 4 }}>Looks issued, not invented.</div>
            </div>
            <ul style={{ paddingLeft: 18, marginTop: 10, lineHeight: 1.6, fontSize: 12.5 }}>
              <li><b>Type:</b> compressed display (Archivo 900) for headlines · IBM Plex Mono for IDs/hours · serif italic for stamps.</li>
              <li><b>Color:</b> marine navy on regulated cream. Safety yellow only on action. Signal red for danger, green for verified.</li>
              <li><b>Page-not-screen:</b> every view has Form #, revision, effective date, page x/y, "issued under" footer.</li>
              <li><b>Stamps + seals:</b> verified / pending / void as rubber-stamps. Dual SPRAT·IRATA hex seal on identity pages.</li>
              <li><b>Numbers dominate:</b> hours, SN, due-deltas read first; descriptors second.</li>
            </ul>
            <div style={{ marginTop: 12, fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 13, letterSpacing: 1.5, color: C.ink, textTransform: 'uppercase' }}>The three directions</div>
            <div style={{ borderTop: `1.5px solid ${C.ink}`, marginTop: 4, paddingTop: 6 }}>
              <div><b>D1 · Form 27-A</b> — pure ISO document. Form-field aesthetic, hairlines, white inset panels.</div>
              <div style={{ marginTop: 4 }}><b>D2 · Field Manual</b> — military / aviation manual. Black bars, signal-orange accent, big numerics.</div>
              <div style={{ marginTop: 4 }}><b>D3 · Compliance Card</b> — credential-forward. Banded header, watermark seal, rubber-stamps.</div>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: C.ink3, fontFamily: FM }}>Use Tweaks (toolbar) to focus one direction or swap accent.</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: `repeating-linear-gradient(-45deg, ${C.yellow}, ${C.yellow} 6px, ${C.ink} 6px, ${C.ink} 12px)` }} />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection id="dir-a" title="D1 · Form 27-A" subtitle="ISO document. Form-field aesthetic, hairline rules, white inset panels, yellow-only action.">
        <DCArtboard id="a-dash" label="Form 27 · Today" width={PHONE_W} height={PHONE_H}><D1_Dashboard /></DCArtboard>
        <DCArtboard id="a-records" label="Form 14 · Records" width={PHONE_W} height={PHONE_H}><D1_Records /></DCArtboard>
        <DCArtboard id="a-new" label="Form 03 · New" width={PHONE_W} height={PHONE_H}><D1_NewEntry /></DCArtboard>
        <DCArtboard id="a-gear" label="Form 09 · Gear" width={PHONE_W} height={PHONE_H}><D1_Gear /></DCArtboard>
        <DCArtboard id="a-profile" label="Form 00 · ID" width={PHONE_W} height={PHONE_H}><D1_Profile /></DCArtboard>
      </DCSection>

      <DCSection id="dir-b" title="D2 · Field Manual" subtitle="Military/aviation manual. Chapter heads, signal-orange accent, big numerics.">
        <DCArtboard id="b-dash" label="Ch. 1 · Briefing" width={PHONE_W} height={PHONE_H}><D2_Dashboard /></DCArtboard>
        <DCArtboard id="b-records" label="Ch. 2 · Log" width={PHONE_W} height={PHONE_H}><D2_Records /></DCArtboard>
        <DCArtboard id="b-new" label="Ch. 1 · New" width={PHONE_W} height={PHONE_H}><D2_NewEntry /></DCArtboard>
        <DCArtboard id="b-gear" label="Ch. 3 · Equipment" width={PHONE_W} height={PHONE_H}><D2_Gear /></DCArtboard>
        <DCArtboard id="b-profile" label="Ch. 4 · Card" width={PHONE_W} height={PHONE_H}><D2_Profile /></DCArtboard>
      </DCSection>

      <DCSection id="dir-c" title="D3 · Compliance Card" subtitle="Credential-forward. Banded yellow header, watermark seal, rubber-stamp statuses.">
        <DCArtboard id="c-dash" label="Today" width={PHONE_W} height={PHONE_H}><D3_Dashboard /></DCArtboard>
        <DCArtboard id="c-records" label="Records" width={PHONE_W} height={PHONE_H}><D3_Records /></DCArtboard>
        <DCArtboard id="c-new" label="New record" width={PHONE_W} height={PHONE_H}><D3_NewEntry /></DCArtboard>
        <DCArtboard id="c-gear" label="Gear register" width={PHONE_W} height={PHONE_H}><D3_Gear /></DCArtboard>
        <DCArtboard id="c-profile" label="Operator card" width={PHONE_W} height={PHONE_H}><D3_Profile /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// ── D2 palette presets ──────────────────────────────────────────────────────
// Each palette swaps the ink/paper/accent system. Signal red/green/yellow are
// kept (or lightly retuned) so danger/verified meanings still read.

const PALETTES = {
  orange:   { name: 'Signal Orange', ink:'#0b2545', ink2:'#1c3a64', ink3:'#5a6a83', paper:'#f6f3eb', paper2:'#efeae0', accent:'#e85a1f', accentSoft:'#fbe1d2',
              yellow:'#f5c518', yellowDeep:'#c79a0a', yellowSoft:'#fbeec1', red:'#b32f1a', redSoft:'#f6dad2', green:'#1f7a3d', greenSoft:'#d2e5d4' },
  hiviz:    { name: 'High-Vis',      ink:'#0e0e0e', ink2:'#2a2a2a', ink3:'#6b6b6b', paper:'#ecece6', paper2:'#dedcd2', accent:'#ffd400', accentSoft:'#fff2a8',
              yellow:'#ffd400', yellowDeep:'#b88f00', yellowSoft:'#fff2a8', red:'#c4231a', redSoft:'#f6cfca', green:'#1f7a3d', greenSoft:'#d2e5d4' },
  refinery: { name: 'Refinery',      ink:'#0c3e44', ink2:'#175058', ink3:'#5a7479', paper:'#f0ead8', paper2:'#e6dec7', accent:'#e85a1f', accentSoft:'#fbe1d2',
              yellow:'#e5b400', yellowDeep:'#a88200', yellowSoft:'#f3e3a8', red:'#b32f1a', redSoft:'#f0d3cb', green:'#266b48', greenSoft:'#c8dccf' },
  nightops: { name: 'Night Ops',     ink:'#f0e4c8', ink2:'#cdbf9a', ink3:'#9a9279', paper:'#1a1a18', paper2:'#26241f', accent:'#ffb020', accentSoft:'#3b2f12',
              yellow:'#ffb020', yellowDeep:'#ffd060', yellowSoft:'#3b2f12', red:'#ff6a4a', redSoft:'#3a1c14', green:'#5fc287', greenSoft:'#15301f' },
  arctic:   { name: 'Arctic',        ink:'#0b2545', ink2:'#1c3a64', ink3:'#5a6a83', paper:'#eef3f7', paper2:'#dfe7ee', accent:'#00a3c4', accentSoft:'#c7e9f1',
              yellow:'#f0b400', yellowDeep:'#a87f00', yellowSoft:'#f6e5a8', red:'#b32f1a', redSoft:'#f6dad2', green:'#1f7a3d', greenSoft:'#d2e5d4' },
  heritage: { name: 'Heritage',      ink:'#1f3b2c', ink2:'#2d5440', ink3:'#5e7868', paper:'#ebe3d2', paper2:'#dfd5be', accent:'#a83a25', accentSoft:'#ecc8be',
              yellow:'#d49a1c', yellowDeep:'#94680a', yellowSoft:'#f0dca8', red:'#a83a25', redSoft:'#ecc8be', green:'#365c3f', greenSoft:'#cad9c8' },
  // refinery / arctic direction — deep cool ink + crisp accent
  drydock:  { name: 'Drydock',       ink:'#0a3554', ink2:'#16486c', ink3:'#5d7790', paper:'#ece4cf', paper2:'#e0d7be', accent:'#c63d1f', accentSoft:'#f3cfc2',
              yellow:'#d99a14', yellowDeep:'#9a6a06', yellowSoft:'#f0dca8', red:'#c63d1f', redSoft:'#f3cfc2', green:'#256b48', greenSoft:'#c8dccf' },
  tidewater:{ name: 'Tidewater',     ink:'#0e3a40', ink2:'#1a525a', ink3:'#5e7c80', paper:'#e6ece8', paper2:'#d6dfdb', accent:'#5cb3c4', accentSoft:'#d2ebf0',
              yellow:'#d4a514', yellowDeep:'#937007', yellowSoft:'#eed8a3', red:'#b03020', redSoft:'#eccac2', green:'#2c7256', greenSoft:'#c8dccf' },
  glacier:  { name: 'Glacier',       ink:'#13203a', ink2:'#243353', ink3:'#5e6a82', paper:'#eef1f3', paper2:'#dde2e7', accent:'#4ad6a4', accentSoft:'#cbf1de',
              yellow:'#e6b200', yellowDeep:'#a17a00', yellowSoft:'#f4e3a3', red:'#c43224', redSoft:'#f0cfca', green:'#23805a', greenSoft:'#c8e2d2' },
};

function hexA(hex, alpha) {
  // accept 6-digit hex, return rgba string
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.orange;
  Object.assign(C, {
    ink: p.ink, ink2: p.ink2, ink3: p.ink3,
    paper: p.paper, paper2: p.paper2,
    hair: p.ink,
    hairSoft: hexA(p.ink, 0.22),
    hairFaint: hexA(p.ink, 0.10),
    yellow: p.yellow, yellowDeep: p.yellowDeep, yellowSoft: p.yellowSoft,
    red: p.red, redSoft: p.redSoft,
    green: p.green, greenSoft: p.greenSoft,
  });
  Object.assign(C2, C, { accent: p.accent, accentSoft: p.accentSoft });
}

Object.assign(window, { Wireframes, PALETTES, applyPalette,
  C, C2, FD, FB, FM, FS,
  D2_Dashboard, D2_Records, D2_Gear, D2_NewEntry, D2_Profile, D2_Header, D2_TabBar, D2_Dial,
  Chip, Stamp, Bar, Kpi, SectionH, Row, Field, SignBlock, Seal });
