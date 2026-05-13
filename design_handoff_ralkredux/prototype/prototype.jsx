/* prototype.jsx — D2 / Tidewater as a clickable iOS prototype.
   Tab navigation, working new-record flow (step 1 → 2 → 3 → signed),
   advisory dismiss, gear inspection toggle. */

applyPalette('tidewater');

const TYPE_PRESETS = {
  archivo:  { l: 'Archivo · Inter · Plex',     d: "'Archivo', system-ui, sans-serif",          b: "'Inter', system-ui, sans-serif",        m: "'IBM Plex Mono', monospace" },
  oswald:   { l: 'Oswald · Source · Plex',     d: "'Oswald', system-ui, sans-serif",           b: "'Source Sans 3', system-ui, sans-serif",m: "'IBM Plex Mono', monospace" },
  anton:    { l: 'Anton · Inter · JetBrains',  d: "'Anton', 'Oswald', system-ui, sans-serif",  b: "'Inter', system-ui, sans-serif",        m: "'JetBrains Mono', monospace" },
  barlow:   { l: 'Barlow Cond · Plex · Plex',  d: "'Barlow Condensed', system-ui, sans-serif", b: "'IBM Plex Sans', system-ui, sans-serif",m: "'IBM Plex Mono', monospace" },
  saira:    { l: 'Saira Cond · Inter · Space', d: "'Saira Condensed', system-ui, sans-serif",  b: "'Inter', system-ui, sans-serif",        m: "'Space Mono', monospace" },
  antonio:  { l: 'Antonio · Source · JetBr',   d: "'Antonio', system-ui, sans-serif",          b: "'Source Sans 3', system-ui, sans-serif",m: "'JetBrains Mono', monospace" },
  bebas:    { l: 'Bebas · Inter · Plex',       d: "'Bebas Neue', system-ui, sans-serif",       b: "'Inter', system-ui, sans-serif",        m: "'IBM Plex Mono', monospace" },
};

function TypePicker({ value, onChange }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, width: 260, background: '#fff', border: '1.5px solid #0e3a40', boxShadow: '0 6px 24px rgba(0,0,0,0.18)', zIndex: 1000, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: '#0e3a40', color: '#e6ece8', padding: '8px 12px', fontFamily: "'Archivo', system-ui", fontWeight: 900, fontSize: 12, letterSpacing: 2, display: 'flex', justifyContent: 'space-between' }}>
        <span>TYPOGRAPHY</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, opacity: 0.7 }}>APPX. T</span>
      </div>
      <div style={{ maxHeight: '80vh', overflow: 'auto' }}>
        {Object.entries(TYPE_PRESETS).map(([k, p]) => {
          const active = value === k;
          return (
            <button key={k} onClick={() => onChange(k)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderBottom: '1px solid rgba(14,58,64,0.15)', background: active ? '#e6ece8' : '#fff', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: p.d, fontWeight: 900, fontSize: 18, color: '#0e3a40', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>FORM 27-A</span>
                <span style={{ fontFamily: p.m, fontSize: 10, color: '#5e7c80', whiteSpace: 'nowrap' }}>OP-44021</span>
              </div>
              <div style={{ fontFamily: p.b, fontSize: 11, color: active ? '#0e3a40' : '#5e7c80', marginTop: 2, fontWeight: active ? 600 : 400 }}>{p.l}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Tweaks plumbing ──────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "type": "archivo"
}/*EDITMODE-END*/;

// Build per-tab overlay so the D2 screens render inside an iPhone (402×874).
// The existing D2 components are sized for ~320×640; we scale them and crop
// the bottom tab bar / chrome (we render our own tab bar) and replace the
// "+New record" CTA with a working one.

function useNav() {
  const [tab, setTab] = React.useState('brief');
  const [modal, setModal] = React.useState(null); // null | 'new' | 'settings'
  const [step, setStep] = React.useState(1);      // 1..3 inside new
  const [hours, setHours] = React.useState(8.5);
  const [advisoryCleared, setAdvisoryCleared] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(0);
  const [settings, setSettings] = React.useState({
    units: 'metric',
    scheme: 'sprat',
    autoSync: true,
    offlineMode: false,
    biometric: true,
    notify: 'critical',
    sound: false,
    haptics: true,
  });
  const setSetting = (k, v) => setSettings(s => ({ ...s, [k]: v }));
  return { tab, setTab, modal, setModal, step, setStep, hours, setHours, advisoryCleared, setAdvisoryCleared, submitted, setSubmitted, settings, setSetting };
}

// ── Tab bar — rebuilt as interactive ────────────────────────────────────────
function TabBarLive({ tab, setTab }) {
  const labels = [
    { id: 'brief',   l: 'BRIEF' },
    { id: 'log',     l: 'LOG' },
    { id: 'gear',    l: 'GEAR' },
    { id: 'card',    l: 'CARD' },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, height: 56, background: C.ink, display: 'flex', zIndex: 30 }}>
      {labels.map((x, i) => {
        const active = tab === x.id;
        return (
          <button key={x.id} onClick={() => setTab(x.id)} style={{
            flex: 1, border: 'none', background: 'transparent',
            borderRight: i < labels.length - 1 ? `1px solid rgba(246,243,235,0.2)` : 'none',
            color: active ? C2.accent : 'rgba(246,243,235,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 13, letterSpacing: 2,
            borderTop: active ? `2px solid ${C2.accent}` : `2px solid transparent`,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>{x.l}</button>
        );
      })}
    </div>
  );
}

// ── BRIEF ────────────────────────────────────────────────────────────────────
function ScreenBrief({ nav }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.1 · BRIEFING" ttl="DAY 130 / 365" sub="10 May 2026 · CLR · 12°C · W 7kt" />
      <div style={{ padding: '12px 16px 88px', height: 'calc(100% - 84px)', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: `1.5px solid ${C.ink}`, paddingBottom: 8 }}>
          <div>
            <div style={{ fontFamily: FB, fontSize: 10, letterSpacing: 1.8, color: C.ink3, textTransform: 'uppercase' }}>Cumulative rope hr</div>
            <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 64, color: C.ink, lineHeight: 0.85 }}>{(612 + nav.submitted * 8.5).toFixed(1).split('.')[0]}<span style={{ fontSize: 28, color: C2.accent, marginLeft: 4 }}>.{(612 + nav.submitted * 8.5).toFixed(1).split('.')[1]}</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FM, fontSize: 12, color: C.green, fontWeight: 600 }}>▲ +{48 + nav.submitted * 8.5} / 30d</div>
            <div style={{ fontFamily: FM, fontSize: 10.5, color: C.ink3 }}>avg 6.4 hr/op-day</div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <D2_Dial label="SPRAT" target="II → III" pct={0.612} v="612" t="1000" />
          <D2_Dial label="IRATA" target="L1 → L2"  pct={0.612} v="612" t="1000" />
        </div>

        {!nav.advisoryCleared && (
          <div style={{ marginTop: 14, border: `1.5px solid ${C2.accent}`, background: C2.accentSoft }}>
            <div style={{ background: C2.accent, color: '#fff', padding: '5px 12px', fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 12, letterSpacing: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span>⚠ ADVISORY · OPS-04</span><span style={{ fontFamily: FM, fontSize: 11 }}>P1</span>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 16, color: C.ink }}>1× gear past inspection.</div>
              <div style={{ fontFamily: FM, fontSize: 11.5, color: C.ink2, marginTop: 2 }}>BEAL STATIC 10.5 · R-001 · −11d · DO NOT DEPLOY</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => nav.setTab('gear')} style={{ padding: '5px 12px', border: `1.5px solid ${C.ink}`, background: '#fff', color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>Inspect →</button>
                <button onClick={() => nav.setAdvisoryCleared(true)} style={{ padding: '5px 12px', border: `1.5px solid ${C.ink3}`, background: 'transparent', color: C.ink2, fontFamily: FD, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>Dismiss</button>
              </div>
            </div>
          </div>
        )}
        {nav.advisoryCleared && (
          <div style={{ marginTop: 14, padding: '8px 12px', border: `1px solid ${C.hairSoft}`, color: C.ink3, fontFamily: FM, fontSize: 11.5 }}>Advisory acknowledged · OPS-04 logged 18:42</div>
        )}

        <div style={{ marginTop: 14, fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 12, letterSpacing: 1.8, color: C.ink3, textTransform: 'uppercase' }}>Today's actions</div>
        <div style={{ borderTop: `1.5px solid ${C.ink}`, marginTop: 4 }}>
          {[
            { t: 'Open new record',       s: '§3',  em: true,  on: () => nav.setModal('new') },
            { t: 'Countersign 2 pending', s: '§14', on: () => nav.setTab('log') },
            { t: 'Inspect 1 item',        s: '§09', on: () => nav.setTab('gear') },
          ].map((a, i) => (
            <button key={i} onClick={a.on} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.hairSoft}`, gap: 10, background: 'transparent', border: 'none', borderBottom: `1px solid ${C.hairSoft}`, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', textAlign: 'left' }}>
              <span style={{ width: 30, height: 30, background: a.em ? C2.accent : C.paper2, color: a.em ? '#fff' : C.ink2, border: `1.5px solid ${C.ink}`, fontFamily: FD, fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={{ flex: 1, fontFamily: FD, fontWeight: 700, fontSize: 15, color: C.ink }}>{a.t}</span>
              <span style={{ fontFamily: FM, fontSize: 11, color: C.ink3 }}>{a.s}</span>
              <span style={{ fontFamily: FD, fontSize: 18, color: C.ink2 }}>→</span>
            </button>
          ))}
        </div>

        {nav.submitted > 0 && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: C.greenSoft, border: `1.5px solid ${C.green}` }}>
            <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 13, color: C.green, letterSpacing: 1.2 }}>✓ {nav.submitted} RECORD{nav.submitted > 1 ? 'S' : ''} SIGNED TODAY</div>
            <div style={{ fontFamily: FM, fontSize: 11, color: C.ink2, marginTop: 2 }}>Hash chain extended · ledger synced</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LOG ──────────────────────────────────────────────────────────────────────
function ScreenLog({ nav }) {
  const baseRows = [
    { d: '08·05', site: 'Pier 9, leg-3',  cl: 'SKYLINE',   hr: '8.5', s: 'OK' },
    { d: '06·05', site: 'WTG-14 blade',   cl: 'NORTHWIND', hr: '7.0', s: 'PEN' },
    { d: '04·05', site: 'Stadium walk',   cl: 'CITYSPRTS', hr: '4.5', s: 'DRF' },
    { d: '28·04', site: 'Flare A-7',      cl: 'PETROCO',   hr: '9.0', s: 'OK' },
    { d: '26·04', site: 'Bridge B-7',     cl: 'DOT-NW',    hr: '6.5', s: 'AMD' },
    { d: '22·04', site: 'WTG-09 yaw',     cl: 'NORTHWIND', hr: '8.0', s: 'OK' },
  ];
  const newRows = Array.from({ length: nav.submitted }, () => ({ d: '10·05', site: 'PIER 9 / LEG 3', cl: 'SKYLINE', hr: nav.hours.toFixed(1), s: 'OK' }));
  const rows = [...newRows, ...baseRows];
  const tone = (s) => s === 'OK' ? C.green : s === 'PEN' ? C.yellowDeep : s === 'DRF' ? C.ink3 : '#1ea7c4';
  const [range, setRange] = React.useState(1);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.2 · LOG" ttl="LOG-2026" sub={`${47 + nav.submitted} entries · ${(612.5 + nav.submitted * nav.hours).toFixed(1)} cumulative hr`} />
      <div style={{ padding: '12px 16px 88px', height: 'calc(100% - 84px)', overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 0, border: `1.5px solid ${C.ink}` }}>
          {['7D', '30D', '90D', 'YTD', 'ALL'].map((r, i) => (
            <button key={r} onClick={() => setRange(i)} style={{ flex: 1, padding: '6px 0', textAlign: 'center', background: i === range ? C.ink : 'transparent', color: i === range ? C.paper : C.ink2, borderRight: i < 4 ? `1px solid ${C.hairSoft}` : 'none', border: 'none', fontFamily: FD, fontWeight: 800, fontSize: 11.5, letterSpacing: 1.5, cursor: 'pointer' }}>{r}</button>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: 12, borderBottom: `1.5px solid ${C.ink}`, paddingBottom: 8, gap: 16 }}>
          <div><div style={{ fontFamily: FD, fontWeight: 900, fontSize: 26 }}>{(43.5 + nav.submitted * nav.hours).toFixed(1)}<span style={{ fontFamily: FM, fontSize: 11, color: C.ink3, marginLeft: 4 }}>HR</span></div><div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3, letterSpacing: 1.5 }}>SHOWN</div></div>
          <div><div style={{ fontFamily: FD, fontWeight: 900, fontSize: 26 }}>{(6 + (nav.submitted > 0 ? 1 : 0)).toString().padStart(2,'0')}<span style={{ fontFamily: FM, fontSize: 11, color: C.ink3, marginLeft: 4 }}>DAYS</span></div><div style={{ fontFamily: FM, fontSize: 9.5, color: C.ink3, letterSpacing: 1.5 }}>ON ROPE</div></div>
          <div style={{ flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button onClick={() => nav.setModal('new')} style={{ padding: '4px 10px', border: `1.5px solid ${C.ink}`, background: C.ink, color: C.paper, fontFamily: FD, fontWeight: 900, fontSize: 11, letterSpacing: 1.5, cursor: 'pointer' }}>+ ADD</button>
          </div>
        </div>

        <Row head cols={[{ v: 'DATE', w: '52px' }, { v: 'SITE · CLIENT' }, { v: 'HR', w: '36px', align: 'right' }, { v: 'STS', w: '42px', align: 'right' }]} />
        {rows.map((r, i) => (
          <Row key={i} cols={[
            { v: r.d, w: '52px', mono: true, size: 11, tone: C.ink3 },
            { v: <div>
              <div style={{ fontFamily: FB, fontSize: 13, fontWeight: 600 }}>{r.site}</div>
              <div style={{ fontFamily: FM, fontSize: 10, color: C.ink3 }}>{r.cl}</div>
            </div> },
            { v: r.hr, w: '36px', align: 'right', mono: true, bold: true, size: 14 },
            { v: <span style={{ fontFamily: FD, fontWeight: 900, fontSize: 11, color: tone(r.s), letterSpacing: 1.5 }}>{r.s}</span>, w: '42px', align: 'right' },
          ]} />
        ))}

        <div style={{ marginTop: 14, fontFamily: FM, fontSize: 11, color: C.ink3 }}>EXPORT: <span style={{ color: C2.accent, fontWeight: 700 }}>JSON</span> · <span style={{ color: C2.accent, fontWeight: 700 }}>CSV</span> · <span style={{ color: C2.accent, fontWeight: 700 }}>PDF (audit)</span></div>
      </div>
    </div>
  );
}

// ── GEAR ─────────────────────────────────────────────────────────────────────
function ScreenGear({ nav }) {
  const [items, setItems] = React.useState([
    { n: 'PETZL AVAO BOD',    cat: 'HARN', sn: 'A8472', due: 42,  s: 'OK', icon: 'H' },
    { n: 'BEAL STATIC 10.5',  cat: 'ROPE', sn: 'R-001', due: nav.advisoryCleared ? 180 : -11, s: nav.advisoryCleared ? 'OK' : 'OVR',icon: 'R' },
    { n: 'STERLING HTP 11',   cat: 'ROPE', sn: 'R-004', due: 118, s: 'OK', icon: 'R' },
    { n: 'PETZL VERTEX',      cat: 'HEAD', sn: 'H-2201',due: null,s: 'OK', icon: 'V' },
    { n: 'PETZL I\u2019D S',     cat: 'DESC', sn: 'D-9912',due: 21, s: 'SOON',icon: 'D' },
    { n: 'CROLL L',           cat: 'ASC',  sn: 'C-771', due: 84,  s: 'OK', icon: 'A' },
  ]);
  React.useEffect(() => {
    if (nav.advisoryCleared) {
      setItems(its => its.map(it => it.sn === 'R-001' ? { ...it, due: 180, s: 'OK' } : it));
    }
  }, [nav.advisoryCleared]);

  const inspect = (sn) => {
    setItems(its => its.map(it => it.sn === sn ? { ...it, due: 180, s: 'OK' } : it));
    if (sn === 'R-001') nav.setAdvisoryCleared(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.3 · GEAR" ttl="EQUIPMENT" sub={`${items.length} active · ${items.filter(it => it.s === 'OVR').length} overdue · 22 insp YTD`} />
      <div style={{ padding: '12px 16px 88px', height: 'calc(100% - 84px)', overflow: 'auto' }}>
        <div style={{ marginTop: 4, borderTop: `1.5px solid ${C.ink}` }}>
          {items.map((it) => {
            const tone = it.due === null ? C.ink3 : it.due < 0 ? C.red : it.due < 30 ? C.yellowDeep : C.green;
            const dueTxt = it.due === null ? '——' : it.due < 0 ? `${it.due}d` : `+${it.due}d`;
            return (
              <div key={it.sn} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: `1px solid ${C.hairSoft}` }}>
                <div style={{ width: 32, height: 32, background: C.ink, color: C.paper, fontFamily: FD, fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FB, fontSize: 13, fontWeight: 600 }}>{it.n}</div>
                  <div style={{ fontFamily: FM, fontSize: 10.5, color: C.ink3 }}>{it.cat} · SN {it.sn}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: FM, fontSize: 13, color: tone, fontWeight: 700 }}>{dueTxt}</div>
                  <div style={{ fontFamily: FD, fontWeight: 900, fontSize: 10, color: tone, letterSpacing: 1.5 }}>{it.s}</div>
                </div>
                {(it.s === 'OVR' || it.s === 'SOON') && (
                  <button onClick={() => inspect(it.sn)} style={{ marginLeft: 6, padding: '5px 8px', border: `1.5px solid ${C.ink}`, background: it.s === 'OVR' ? C2.accent : C.paper2, color: it.s === 'OVR' ? '#fff' : C.ink, fontFamily: FD, fontWeight: 800, fontSize: 10, letterSpacing: 1.2, cursor: 'pointer' }}>INSP</button>
                )}
              </div>
            );
          })}
        </div>

        <button style={{ width: '100%', marginTop: 14, height: 44, border: `1.5px solid ${C.ink}`, background: C.ink, color: C.paper, fontFamily: FD, fontWeight: 900, fontSize: 13, letterSpacing: 2, cursor: 'pointer' }}>＋ ADD EQUIPMENT</button>
      </div>
    </div>
  );
}

// ── CARD ─────────────────────────────────────────────────────────────────────
function ScreenCard({ nav }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.paper, color: C.ink, fontFamily: FB, overflow: 'hidden' }}>
      <D2_Header chap="CH.4 · CARD" ttl="OPERATOR" sub="OP-44021 · Skyline Rope LLC" />
      <button onClick={() => nav.setModal('settings')} aria-label="Settings" style={{ position: 'absolute', top: 14, right: 14, width: 36, height: 36, border: `1.5px solid ${C2.accent}`, background: 'transparent', color: C2.accent, fontFamily: FD, fontWeight: 900, fontSize: 18, cursor: 'pointer', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙</button>
      <div style={{ padding: '12px 16px 88px', height: 'calc(100% - 84px)', overflow: 'auto' }}>
        <div style={{ border: `1.5px solid ${C.ink}`, background: C.ink, color: C.paper, padding: 14, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, height: 4, width: 80, background: C2.accent }} />
          <div style={{ fontFamily: FM, fontSize: 10, color: 'rgba(246,243,235,0.55)', letterSpacing: 1.8 }}>ROPE ACCESS · OPERATOR CARD</div>
          <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 30, lineHeight: 1, marginTop: 4 }}>ORTIZ, J.</div>
          <div style={{ fontFamily: FM, fontSize: 11.5, color: 'rgba(246,243,235,0.7)', marginTop: 4 }}>OP-44021 · ISSUED 2019</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <span style={{ padding: '4px 9px', border: `1.5px solid ${C2.accent}`, color: C2.accent, fontFamily: FD, fontWeight: 900, fontSize: 12, letterSpacing: 1.5 }}>SPRAT II</span>
            <span style={{ padding: '4px 9px', border: `1.5px solid ${C2.accent}`, color: C2.accent, fontFamily: FD, fontWeight: 900, fontSize: 12, letterSpacing: 1.5 }}>IRATA L1</span>
          </div>
          <div style={{ marginTop: 12, fontFamily: FM, fontSize: 10.5, color: 'rgba(246,243,235,0.55)' }}>chain head · 3f9a1c…b820</div>
        </div>

        <div style={{ marginTop: 14, fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 12, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' }}>Progress to next level</div>
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FM, fontSize: 11, color: C.ink2 }}><span>SPRAT II → III</span><span>612 / 1000 (61%)</span></div>
          <Bar value={0.612} tone={C2.accent} height={12} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FM, fontSize: 11, color: C.ink2, marginTop: 10 }}><span>IRATA L1 → L2</span><span>612 / 1000 (61%)</span></div>
          <Bar value={0.612} tone={C2.accent} height={12} />
        </div>

        <div style={{ marginTop: 14, fontFamily: FD, fontWeight: 800, fontStretch: '85%', fontSize: 12, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' }}>Counter-signing officers</div>
        <div style={{ borderTop: `1.5px solid ${C.ink}`, marginTop: 4 }}>
          {[
            { n: 'K. BRIGGS', r: 'IRATA L3 Assessor', id: 'IR-30219', sg: 5 },
            { n: 'A. WEN',    r: 'SPRAT Evaluator',   id: 'SP-1124-7700', sg: 12 },
            { n: 'M. HALSE',  r: 'IRATA L3',          id: 'IR-29904', sg: 3 },
          ].map((v) => (
            <div key={v.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${C.hairSoft}` }}>
              <div style={{ width: 30, height: 30, background: C.paper2, border: `1.5px solid ${C.ink}`, fontFamily: FD, fontWeight: 900, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.n.split(' ').map(s => s[0]).join('')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 13 }}>{v.n}</div>
                <div style={{ fontFamily: FM, fontSize: 10.5, color: C.ink3 }}>{v.r} · {v.id}</div>
              </div>
              <span style={{ fontFamily: FM, fontSize: 12, color: C.ink2 }}>{v.sg} sg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── New record modal — full bottom sheet ─────────────────────────────────────
function NewRecordSheet({ nav }) {
  const close = () => { nav.setModal(null); nav.setStep(1); };
  const back = () => nav.step > 1 ? nav.setStep(nav.step - 1) : close();
  const next = () => {
    if (nav.step < 3) nav.setStep(nav.step + 1);
    else {
      nav.setSubmitted(nav.submitted + 1);
      close();
      nav.setTab('brief');
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', WebkitTapHighlightColor: 'transparent' }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', height: '94%', background: C.paper, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: `2px solid ${C2.accent}`, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Sheet header */}
        <div style={{ background: C.ink, color: C.paper, padding: '14px 16px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, height: 4, width: 80, background: C2.accent }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={back} style={{ background: 'transparent', border: 'none', color: C.paper, fontFamily: FD, fontWeight: 800, fontSize: 13, letterSpacing: 1.5, cursor: 'pointer' }}>{nav.step === 1 ? '✕ CANCEL' : '← BACK'}</button>
            <span style={{ fontFamily: FM, fontSize: 11, color: 'rgba(246,243,235,0.6)', letterSpacing: 1.5 }}>STEP {nav.step} / 3</span>
          </div>
          <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 24, marginTop: 4 }}>
            {nav.step === 1 && 'NEW ENTRY'}
            {nav.step === 2 && 'DETAIL'}
            {nav.step === 3 && 'SIGN + LOCK'}
          </div>
          <div style={{ fontFamily: FB, fontSize: 11.5, color: 'rgba(246,243,235,0.7)', marginTop: 2 }}>
            {nav.step === 1 && 'Job particulars'}
            {nav.step === 2 && 'Work performed, gear, photos'}
            {nav.step === 3 && 'Verify and submit to chain'}
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', height: 6, background: C.paper2 }}>
          <div style={{ width: `${(nav.step / 3) * 100}%`, background: C2.accent, transition: 'width 200ms' }} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
          {nav.step === 1 && <Step1 nav={nav} />}
          {nav.step === 2 && <Step2 nav={nav} />}
          {nav.step === 3 && <Step3 nav={nav} />}
        </div>

        <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${C.hairSoft}`, background: C.paper, display: 'flex', gap: 8 }}>
          <button onClick={back} style={{ flex: 1, height: 46, border: `1.5px solid ${C.ink}`, background: '#fff', color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>{nav.step === 1 ? 'Cancel' : 'Back'}</button>
          <button onClick={next} style={{ flex: 1.6, height: 46, border: `1.5px solid ${C.ink}`, background: C2.accent, color: '#fff', fontFamily: FD, fontWeight: 900, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>
            {nav.step === 3 ? '✓ Sign + lock' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step1({ nav }) {
  return (
    <div>
      <div style={{ border: `1.5px solid ${C.ink}`, background: C.white, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: FB, fontSize: 10, color: C.ink3, letterSpacing: 1.5 }}>HOURS ON ROPE</span>
          <span style={{ fontFamily: FM, fontSize: 10, color: C.ink3 }}>FIELD 07</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 6 }}>
          <button onClick={() => nav.setHours(Math.max(0, +(nav.hours - 0.5).toFixed(1)))} style={{ width: 44, height: 44, border: `1.5px solid ${C.ink}`, background: C.white, fontFamily: FD, fontSize: 26, fontWeight: 900, cursor: 'pointer' }}>−</button>
          <span style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 68, color: C.ink, lineHeight: 0.9 }}>{Math.floor(nav.hours).toString().padStart(2,'0')}<span style={{ color: C2.accent }}>.{((nav.hours * 10) % 10).toFixed(0)}</span></span>
          <button onClick={() => nav.setHours(+(nav.hours + 0.5).toFixed(1))} style={{ width: 44, height: 44, border: `1.5px solid ${C.ink}`, background: C2.accent, color: '#fff', fontFamily: FD, fontSize: 26, fontWeight: 900, cursor: 'pointer' }}>＋</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Field n="01" label="Date"      value="2026-05-10" />
        <Field n="02" label="Site"      value="PIER 9 / LEG 3" />
        <Field n="03" label="Client"    value="SKYLINE ROPE LLC" mono={false} />
        <Field n="04" label="Task"      value="INSPECTION" />
        <Field n="05" label="Access"    value="TWO-ROPE / SUSP" />
      </div>
    </div>
  );
}

function Step2({ nav }) {
  const [gear, setGear] = React.useState({ AVAO: true, 'HTP-11': true, VERTEX: true, "I'D S": true, CROLL: true, ASAP: false });
  return (
    <div>
      <SectionH n="06" right="reqd. for sign-off">Gear deployed</SectionH>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Object.entries(gear).map(([k, v]) => (
          <button key={k} onClick={() => setGear(g => ({ ...g, [k]: !v }))} style={{ padding: '5px 10px', border: `1.5px solid ${C.ink}`, background: v ? C.ink : 'transparent', color: v ? C.paper : C.ink, fontFamily: FD, fontWeight: 800, fontSize: 12, letterSpacing: 1.2, cursor: 'pointer' }}>{v ? '✓ ' : '+ '}{k}</button>
        ))}
      </div>

      <SectionH n="07" right="required">Work performed</SectionH>
      <textarea defaultValue="Cleaned tide marks on leg 3, photographed anode wear at lower zone, no structural defects observed." style={{ width: '100%', minHeight: 80, padding: 10, border: `1.5px solid ${C.ink}`, background: '#fff', fontFamily: FB, fontSize: 12.5, color: C.ink, lineHeight: 1.45, resize: 'vertical', outline: 'none' }} />

      <SectionH n="08" right="optional">Conditions</SectionH>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Field n="08a" label="Weather" value="CLR · 12°C" />
        <Field n="08b" label="Wind"    value="W 7 kt" />
        <Field n="08c" label="Height"  value="42.0 m" />
        <Field n="08d" label="Struct." value="STEEL PILE H400" />
      </div>

      <SectionH n="09" right="optional">Attachments</SectionH>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {['IMG_0431', 'IMG_0432', '＋ ADD'].map((p, i) => (
          <div key={p} style={{ aspectRatio: '1', border: `1.5px dashed ${C.ink2}`, background: i < 2 ? C.paper2 : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FM, fontSize: 10, color: C.ink3 }}>{p}</div>
        ))}
      </div>
    </div>
  );
}

function Step3({ nav }) {
  const [verifier, setVerifier] = React.useState('K. Briggs');
  return (
    <div>
      <div style={{ border: `1.5px solid ${C.ink}`, padding: 12, background: '#fff' }}>
        <div style={{ fontFamily: FB, fontSize: 10, color: C.ink3, letterSpacing: 1.5, textTransform: 'uppercase' }}>Record summary</div>
        <div style={{ marginTop: 6 }}>
          <Field n="01" label="Date"   value="2026-05-10" />
          <Field n="02" label="Site"   value="PIER 9 / LEG 3" />
          <Field n="03" label="Client" value="SKYLINE ROPE LLC" mono={false} />
          <Field n="07" label="Hours"  value={nav.hours.toFixed(1)} fill={C2.accentSoft} />
          <Field n="06" label="Gear"   value="5 items" />
        </div>
      </div>

      <SectionH n="10" right="required">Counter-signer</SectionH>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {['K. Briggs · IRATA L3 · IR-30219', 'A. Wen · SPRAT Evaluator · SP-1124-7700', 'M. Halse · IRATA L3 · IR-29904'].map((v) => {
          const name = v.split(' · ')[0];
          const active = name === verifier;
          return (
            <button key={v} onClick={() => setVerifier(name)} style={{ textAlign: 'left', padding: '8px 10px', border: `1.5px solid ${active ? C.ink : C.hairSoft}`, background: active ? C.paper2 : '#fff', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.ink}`, background: active ? C2.accent : '#fff' }} />
              <span style={{ fontFamily: FB, fontSize: 12.5, color: C.ink, fontWeight: 500 }}>{v}</span>
            </button>
          );
        })}
      </div>

      <SectionH n="11">Lock confirmation</SectionH>
      <div style={{ padding: '10px 12px', border: `1.5px solid ${C2.accent}`, background: C2.accentSoft, fontFamily: FM, fontSize: 11.5, color: C.ink2, lineHeight: 1.5 }}>
        Submitting locks this record into your hash chain. Amendments require a counter-signed appendix per IRATA ICOP §G.4.
      </div>
    </div>
  );
}

// ── Settings sheet ───────────────────────────────────────────────────────────
function SettingsRow({ label, hint, n, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderBottom: `1px solid ${C.hairSoft}`, background: '#fff' }}>
      {n ? <span style={{ fontFamily: FM, fontSize: 10, color: C.ink3, width: 24, letterSpacing: 0.5 }}>{n}</span> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: C.ink, letterSpacing: 0.2 }}>{label}</div>
        {hint ? <div style={{ fontFamily: FM, fontSize: 10.5, color: C.ink3, marginTop: 2 }}>{hint}</div> : null}
      </div>
      {right}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 44, height: 24, padding: 2, border: `1.5px solid ${C.ink}`, background: on ? C2.accent : C.paper2, cursor: 'pointer', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <span style={{ width: 16, height: 16, background: '#fff', border: `1px solid ${C.ink}` }} />
    </button>
  );
}

function Seg({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', border: `1.5px solid ${C.ink}` }}>
      {options.map((o, i) => {
        const active = value === o.v;
        return (
          <button key={o.v} onClick={() => onChange(o.v)} style={{ padding: '5px 10px', border: 'none', borderRight: i < options.length - 1 ? `1px solid ${C.hairSoft}` : 'none', background: active ? C.ink : 'transparent', color: active ? C.paper : C.ink2, fontFamily: FD, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, cursor: 'pointer' }}>{o.l}</button>
        );
      })}
    </div>
  );
}

function SettingsSheet({ nav }) {
  const s = nav.settings;
  const set = nav.setSetting;
  const close = () => nav.setModal(null);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end' }} onClick={close}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', height: '94%', background: C.paper, borderTop: `2px solid ${C2.accent}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: C.ink, color: C.paper, padding: '14px 16px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, height: 4, width: 80, background: C2.accent }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={close} style={{ background: 'transparent', border: 'none', color: C.paper, fontFamily: FD, fontWeight: 800, fontSize: 13, letterSpacing: 1.5, cursor: 'pointer' }}>← BACK</button>
            <span style={{ fontFamily: FM, fontSize: 11, color: 'rgba(246,243,235,0.6)', letterSpacing: 1.5 }}>APPX. A</span>
          </div>
          <div style={{ fontFamily: FD, fontWeight: 900, fontStretch: '85%', fontSize: 24, marginTop: 4 }}>SETTINGS</div>
          <div style={{ fontFamily: FB, fontSize: 11.5, color: 'rgba(246,243,235,0.7)', marginTop: 2 }}>Preferences · device · account</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 28px' }}>
          <SectionH n="A.1">Logbook</SectionH>
          <div style={{ border: `1px solid ${C.hair}` }}>
            <SettingsRow n="01" label="Scheme of record" hint="Drives field codes & sign-off rules" right={
              <Seg value={s.scheme} onChange={v => set('scheme', v)} options={[{v:'sprat',l:'SPRAT'},{v:'irata',l:'IRATA'},{v:'both',l:'BOTH'}]} />
            } />
            <SettingsRow n="02" label="Units" hint="Length, height, weight" right={
              <Seg value={s.units} onChange={v => set('units', v)} options={[{v:'metric',l:'METRIC'},{v:'imperial',l:'IMP.'}]} />
            } />
            <SettingsRow n="03" label="Default access mode" hint="Pre-filled on new entries" right={
              <span style={{ fontFamily: FM, fontSize: 11.5, color: C.ink }}>TWO-ROPE ›</span>
            } />
            <SettingsRow n="04" label="Auto-fill from last entry" hint="Site, client, gear" right={
              <Toggle on={true} onChange={() => {}} />
            } />
          </div>

          <SectionH n="A.2">Sync &amp; backup</SectionH>
          <div style={{ border: `1px solid ${C.hair}` }}>
            <SettingsRow n="05" label="Auto-sync to chain" hint={s.autoSync ? 'On Wi-Fi only · last 14:02' : 'Manual — push from Records'} right={
              <Toggle on={s.autoSync} onChange={v => set('autoSync', v)} />
            } />
            <SettingsRow n="06" label="Offline mode" hint="Disable network, queue records locally" right={
              <Toggle on={s.offlineMode} onChange={v => set('offlineMode', v)} />
            } />
            <SettingsRow n="07" label="Encrypted snapshot" hint="Last: 09 May 22:14 · 612.5 hr" right={
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: C2.accent, letterSpacing: 1.5, cursor: 'pointer' }}>SNAPSHOT ›</span>
            } />
            <SettingsRow n="08" label="Restore from snapshot" hint="Requires verifier counter-sign" right={
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: C.ink2, letterSpacing: 1.5, cursor: 'pointer' }}>RESTORE ›</span>
            } />
          </div>

          <SectionH n="A.3">Security</SectionH>
          <div style={{ border: `1px solid ${C.hair}` }}>
            <SettingsRow n="09" label="Biometric unlock" hint="Face ID required to sign" right={
              <Toggle on={s.biometric} onChange={v => set('biometric', v)} />
            } />
            <SettingsRow n="10" label="Auto-lock" hint="After 5 minutes idle" right={
              <span style={{ fontFamily: FM, fontSize: 11.5, color: C.ink }}>5 min ›</span>
            } />
            <SettingsRow n="11" label="Chain head" hint="3f9a1c…b820 · verified 09 May" right={
              <Chip tone="green">OK</Chip>
            } />
          </div>

          <SectionH n="A.4">Notifications</SectionH>
          <div style={{ border: `1px solid ${C.hair}` }}>
            <SettingsRow n="12" label="Notify on" hint="Advisories, inspections, counter-signs" right={
              <Seg value={s.notify} onChange={v => set('notify', v)} options={[{v:'all',l:'ALL'},{v:'critical',l:'CRIT'},{v:'off',l:'OFF'}]} />
            } />
            <SettingsRow n="13" label="Sound" right={
              <Toggle on={s.sound} onChange={v => set('sound', v)} />
            } />
            <SettingsRow n="14" label="Haptics" right={
              <Toggle on={s.haptics} onChange={v => set('haptics', v)} />
            } />
          </div>

          <SectionH n="A.5">Account</SectionH>
          <div style={{ border: `1px solid ${C.hair}` }}>
            <SettingsRow n="15" label="Operator" hint="ORTIZ, J. · OP-44021" right={
              <span style={{ fontFamily: FM, fontSize: 11.5, color: C.ink3 }}>›</span>
            } />
            <SettingsRow n="16" label="Linked verifiers" hint="3 active counter-signers" right={
              <span style={{ fontFamily: FM, fontSize: 11.5, color: C.ink3 }}>›</span>
            } />
            <SettingsRow n="17" label="Export all records" hint="JSON · CSV · PDF (audit)" right={
              <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 11, color: C2.accent, letterSpacing: 1.5 }}>EXPORT ›</span>
            } />
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, height: 42, border: `1.5px solid ${C.ink}`, background: '#fff', color: C.ink, fontFamily: FD, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>Sign out</button>
            <button style={{ flex: 1, height: 42, border: `1.5px solid ${C.red}`, background: 'transparent', color: C.red, fontFamily: FD, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer' }}>Wipe device</button>
          </div>

          <div style={{ marginTop: 14, fontFamily: FM, fontSize: 9.5, color: C.ink3, letterSpacing: 1, textAlign: 'center', lineHeight: 1.6 }}>
            RALKREDUX · v2.6.1 (build 4aa35a3)<br />
            Issued under SPRAT v3.4 / IRATA ICOP Annex G
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
function Prototype() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const preset = TYPE_PRESETS[tweaks.type] || TYPE_PRESETS.archivo;
  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--fd', preset.d);
    r.setProperty('--fb', preset.b);
    r.setProperty('--fm', preset.m);
  }, [tweaks.type]);

  const nav = useNav();
  const screen = nav.tab === 'brief' ? <ScreenBrief nav={nav} />
              : nav.tab === 'log'   ? <ScreenLog nav={nav} />
              : nav.tab === 'gear'  ? <ScreenGear nav={nav} />
              :                       <ScreenCard nav={nav} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#d9d4c5', padding: 24 }}>
      <IOSDevice width={402} height={874} dark={false}>
        <div style={{ position: 'absolute', inset: 0, paddingTop: 0 }}>
          <div style={{ position: 'absolute', inset: 0, top: 54 }}>{screen}</div>
          <TabBarLive tab={nav.tab} setTab={nav.setTab} />
          {nav.modal === 'new' && <NewRecordSheet nav={nav} />}
          {nav.modal === 'settings' && <SettingsSheet nav={nav} />}
        </div>
      </IOSDevice>
      <TypePicker value={tweaks.type} onChange={v => setTweak('type', v)} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Prototype />);
