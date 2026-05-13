/* brand.jsx — Logo & brand system explorations for RALKREDUX.
   Uses the Tidewater palette + Archivo/Inter/Plex type from official.jsx.
   Five logo directions + shared brand system (stamps, pattern, seal, loading,
   empty states). */

const B = {
  ink: '#0b2545', ink2: '#1c3a64', ink3: '#5a6a83',
  paper: '#f6f3eb', paper2: '#efeae0', white: '#ffffff',
  hair: '#0b2545',
  hairSoft: 'rgba(11,37,69,0.22)',
  hairFaint: 'rgba(11,37,69,0.10)',
  yellow: '#f5c518', yellowDeep: '#c79a0a', yellowSoft: '#fbeec1',
  red: '#b32f1a', redSoft: '#f6dad2',
  green: '#1f7a3d', greenSoft: '#d2e5d4'
};

const BFD = "'Archivo', system-ui, sans-serif";
const BFB = "'Inter', system-ui, sans-serif";
const BFM = "'IBM Plex Mono', monospace";
const BFS = "'Newsreader', 'Times New Roman', serif";

// ── 5 logo marks ─────────────────────────────────────────────────────────────

// D1 — RIGGING. Two-rope system + carabiner dots inside a hairline cell.
function MarkRigging({ size = 56, color = B.ink, bg = 'transparent' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={{ background: bg }}>
      <rect x="2" y="2" width="52" height="52" fill="none" stroke={color} strokeWidth="1.6" />
      <line x1="20" y1="8" x2="20" y2="48" stroke={color} strokeWidth="1.6" />
      <line x1="36" y1="8" x2="36" y2="48" stroke={color} strokeWidth="1.6" />
      <circle cx="20" cy="20" r="4" fill={color} />
      <rect x="14" y="16" width="12" height="3" fill={color} />
      <circle cx="36" cy="36" r="4" fill={color} />
      <rect x="30" y="32" width="12" height="3" fill={color} />
      {/* tick marks */}
      <line x1="2" y1="28" x2="6" y2="28" stroke={color} strokeWidth="1" />
      <line x1="50" y1="28" x2="54" y2="28" stroke={color} strokeWidth="1" />
    </svg>);

}

// D2 — HALLMARK. Hex/shield with reversed RALB. Steel die-stamp feel.
function MarkHallmark({ size = 56, color = B.ink, bg = 'transparent', reverse = false }) {
  const fill = reverse ? color : 'none';
  const txt = reverse ? B.paper : color;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={{ background: bg }}>
      <path d="M14 4 L42 4 L52 28 L42 52 L14 52 L4 28 Z" fill={fill} stroke={color} strokeWidth="1.8" />
      <path d="M17 8 L39 8 L48 28 L39 48 L17 48 L8 28 Z" fill="none" stroke={reverse ? B.paper : color} strokeWidth="0.7" opacity="0.6" />
      <text x="28" y="33" textAnchor="middle" fontFamily={BFD} fontWeight="900" fontSize="13" fill={txt} letterSpacing="0.5">RALB</text>
      {/* registration ticks */}
      <line x1="28" y1="0" x2="28" y2="3" stroke={color} strokeWidth="1" />
      <line x1="28" y1="53" x2="28" y2="56" stroke={color} strokeWidth="1" />
    </svg>);

}

// D3 — INDEX TAB. Heavy ink rectangle with notch cut from top-right corner.
function MarkIndexTab({ size = 56, color = B.ink, bg = 'transparent' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={{ background: bg }}>
      <path d="M4 8 L42 8 L52 18 L52 50 L4 50 Z" fill={color} />
      <path d="M42 8 L42 18 L52 18" fill="none" stroke={B.paper} strokeWidth="0.8" opacity="0.5" />
      <text x="28" y="34" textAnchor="middle" fontFamily={BFD} fontWeight="900" fontSize="14" fill={B.paper} letterSpacing="0.5">RALB</text>
      <line x1="10" y1="40" x2="46" y2="40" stroke={B.paper} strokeWidth="0.8" opacity="0.5" />
      <text x="28" y="46" textAnchor="middle" fontFamily={BFM} fontSize="4.5" fill={B.paper} opacity="0.8" letterSpacing="0.6">FORM 27-A</text>
    </svg>);

}

// D4 — DATUM. Crossed angle + center dot + arm ticks. Surveyor's mark.
function MarkDatum({ size = 56, color = B.ink, bg = 'transparent' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={{ background: bg }}>
      <line x1="6" y1="28" x2="50" y2="28" stroke={color} strokeWidth="2" />
      <line x1="28" y1="6" x2="28" y2="50" stroke={color} strokeWidth="2" />
      <circle cx="28" cy="28" r="6" fill={B.paper} stroke={color} strokeWidth="2" />
      <circle cx="28" cy="28" r="2" fill={color} />
      {/* arm ticks */}
      {[14, 20, 36, 42].map((x) => <line key={`h${x}`} x1={x} y1="25" x2={x} y2="31" stroke={color} strokeWidth="1.2" />)}
      {[14, 20, 36, 42].map((y) => <line key={`v${y}`} x1="25" y1={y} x2="31" y2={y} stroke={color} strokeWidth="1.2" />)}
      {/* corner brackets */}
      <path d="M2 2 L8 2 L8 8" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M54 2 L48 2 L48 8" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M2 54 L8 54 L8 48" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M54 54 L48 54 L48 48" fill="none" stroke={color} strokeWidth="1.4" />
    </svg>);

}

// D5 — PLATE. Industrial nameplate w/ reversed RALB and full-name caption.
function MarkPlate({ size = 56, color = B.ink, bg = 'transparent' }) {
  return (
    <svg width={size} height={Math.round(size * 0.75)} viewBox="0 0 56 42" style={{ background: bg }}>
      <rect x="2" y="2" width="52" height="38" fill={color} />
      <rect x="4" y="4" width="48" height="34" fill="none" stroke={B.paper} strokeWidth="0.5" opacity="0.45" />
      {/* corner rivets */}
      {[[6, 6], [50, 6], [6, 36], [50, 36]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="1.2" fill={B.paper} opacity="0.5" />)}
      <text x="28" y="22" textAnchor="middle" fontFamily={BFD} fontWeight="900" fontSize="13" fill={B.paper} letterSpacing="2">RALB</text>
      <line x1="10" y1="26" x2="46" y2="26" stroke={B.paper} strokeWidth="0.5" opacity="0.5" />
      <text x="28" y="33" textAnchor="middle" fontFamily={BFM} fontSize="3.2" fill={B.paper} opacity="0.9" letterSpacing="0.2" textLength="40" lengthAdjust="spacingAndGlyphs">ROPE ACCESS LOGBOOK</text>
    </svg>);

}

const DIRECTIONS = [
{ id: 'plate', name: 'PLATE', tag: 'Industrial · equipment plate', Mark: MarkPlate, desc: 'A riveted nameplate. The mark is a small piece of equipment, with rope-access logbook stamped in. Pairs with the form-number system across the app.' }];


// ── Lockup (wordmark + monogram) ─────────────────────────────────────────────
function Lockup({ Mark, size = 64, dark = false }) {
  const c = dark ? B.paper : B.ink;
  const c2 = dark ? 'rgba(246,243,235,0.6)' : B.ink3;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <Mark size={size} color={c} />
      <div>
        <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: size * 0.42, color: c, letterSpacing: -0.3, lineHeight: 0.95 }}>ROPE ACCESS</div>
        <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: size * 0.42, color: c, letterSpacing: -0.3, lineHeight: 0.95 }}>LOGBOOK</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <div style={{ height: 1, width: 18, background: c, opacity: 0.5 }} />
          <span style={{ fontFamily: BFM, fontSize: size * 0.13, color: c2, letterSpacing: 1.5 }}>RALB · FORM 27-A</span>
        </div>
      </div>
    </div>);

}

// ── Direction card ───────────────────────────────────────────────────────────
function DirectionRow({ dir, idx }) {
  const { Mark } = dir;
  return (
    <section style={{ borderTop: `1px solid ${B.hair}`, padding: '28px 32px 36px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 28, alignItems: 'flex-start' }}>
        {/* meta */}
        <div>
          <div style={{ fontFamily: BFM, fontSize: 10, color: B.ink3, letterSpacing: 1.2 }}>D{idx + 1}</div>
          <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: 26, color: B.ink, marginTop: 4, letterSpacing: -0.2 }}>{dir.name}</div>
          <div style={{ fontFamily: BFB, fontSize: 11, color: B.ink3, marginTop: 4, lineHeight: 1.4 }}>{dir.tag}</div>
          <div style={{ fontFamily: BFB, fontSize: 12, color: B.ink2, marginTop: 12, lineHeight: 1.55 }}>{dir.desc}</div>
        </div>

        {/* showcase */}
        <div>
          {/* Primary lockup */}
          <div style={{ border: `1px solid ${B.hair}`, background: B.paper, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
            <Lockup Mark={Mark} size={68} />
          </div>

          {/* Variations grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            {/* Mark on light */}
            <Tile label="Mark · light">
              <Mark size={56} color={B.ink} />
            </Tile>
            {/* Mark on ink */}
            <Tile label="Mark · dark" dark>
              <Mark size={56} color={B.paper} />
            </Tile>
            {/* Mark on safety yellow */}
            <Tile label="Mark · safety" bg={B.yellow}>
              <Mark size={56} color={B.ink} />
            </Tile>
            {/* Small mark – favicon size */}
            <Tile label="Mark · 24px">
              <Mark size={24} color={B.ink} />
            </Tile>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '180px 180px 1fr', gap: 12, marginTop: 12 }}>
            {/* App icon */}
            <AppIcon Mark={Mark} dir={dir.id} />
            {/* Splash thumbnail */}
            <Splash Mark={Mark} dir={dir.id} />
            {/* Stationery — letterhead band */}
            <Letterhead Mark={Mark} dir={dir.id} />
          </div>
        </div>
      </div>
    </section>);

}

function Tile({ label, dark, bg, children }) {
  const isDark = !!dark;
  const back = bg || (isDark ? B.ink : B.paper);
  const col = isDark ? B.paper : B.ink;
  return (
    <div style={{ ...{ border: `1px solid ${B.hair}`, background: back, minHeight: 96, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }, background: "rgb(28, 46, 72)" }}>
      <div style={{ position: 'absolute', top: 6, left: 8, fontFamily: BFM, fontSize: 8, color: col, opacity: 0.55, letterSpacing: 1 }}>{label}</div>
      {children}
    </div>);

}

function AppIcon({ Mark, dir }) {
  // iOS-style squircle (we approximate with borderRadius 22% of 180 ≈ 40).
  // The design is sharp-cornered but iOS clips icons system-wide — we honour that.
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: -16, left: 0, fontFamily: BFM, fontSize: 9, color: B.ink3, letterSpacing: 1.2 }}>APP ICON</div>
      <div style={{ width: 168, height: 168, borderRadius: 38, background: B.ink, color: B.paper, position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
        {/* faint grid texture */}
        <svg width="168" height="168" style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
          {Array.from({ length: 8 }).map((_, i) =>
          <line key={i} x1={i * 24} y1="0" x2={i * 24} y2="168" stroke={B.paper} strokeWidth="0.5" />
          )}
          {Array.from({ length: 8 }).map((_, i) =>
          <line key={`h${i}`} x1="0" y1={i * 24} x2="168" y2={i * 24} stroke={B.paper} strokeWidth="0.5" />
          )}
        </svg>
        {/* top band */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontFamily: BFM, fontSize: 8, color: 'rgba(246,243,235,0.55)', letterSpacing: 1, borderBottom: '1px solid rgba(246,243,235,0.15)' }}>
          <span>RALB</span><span>27-A</span>
        </div>
        {/* the mark, large, centered */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
          <Mark size={94} color={B.paper} />
        </div>
        {/* yellow accent edge */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 36, height: 4, background: B.yellow }} />
      </div>
    </div>);

}

function Splash({ Mark, dir }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: -16, left: 0, fontFamily: BFM, fontSize: 9, color: B.ink3, letterSpacing: 1.2 }}>SPLASH</div>
      <div style={{ width: 168, height: 168 * (874 / 402), borderRadius: 22, background: B.paper, color: B.ink, position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: `1.5px solid ${B.hair}` }}>
        {/* doc band */}
        <div style={{ background: B.ink, color: B.paper, padding: '4px 8px', display: 'flex', justifyContent: 'space-between', fontFamily: BFM, fontSize: 6.5, letterSpacing: 0.8 }}>
          <span>FORM 27-A · REV 4</span><span>EFF 2025.03</span>
        </div>
        <div style={{ padding: '6px 8px' }}>
          <div style={{ fontFamily: BFB, fontSize: 5.5, color: B.ink3, letterSpacing: 1.8 }}>ROPE ACCESS LOGBOOK</div>
          <div style={{ fontFamily: BFD, fontWeight: 800, fontSize: 14, color: B.ink, letterSpacing: -0.3, lineHeight: 1 }}>RALB</div>
        </div>
        {/* mark, centered */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mark size={84} color={B.ink} />
        </div>
        {/* progress at bottom */}
        <div style={{ position: 'absolute', bottom: 16, left: 12, right: 12 }}>
          <div style={{ fontFamily: BFM, fontSize: 5.5, color: B.ink3, letterSpacing: 1.2, display: 'flex', justifyContent: 'space-between' }}>
            <span>LOADING CHAIN…</span><span>61%</span>
          </div>
          <div style={{ height: 3, background: B.paper2, marginTop: 2, border: `0.5px solid ${B.hair}` }}>
            <div style={{ width: '61%', height: '100%', background: B.yellow }} />
          </div>
        </div>
        {/* doc foot */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '3px 8px', background: B.paper2, borderTop: `0.5px solid ${B.hair}`, display: 'flex', justifyContent: 'space-between', fontFamily: BFM, fontSize: 5.5, color: B.ink2, letterSpacing: 0.6 }}>
          <span>SPRAT v3.4 · IRATA ICOP</span><span>p.1/1</span>
        </div>
      </div>
    </div>);

}

function Letterhead({ Mark, dir }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: -16, left: 0, fontFamily: BFM, fontSize: 9, color: B.ink3, letterSpacing: 1.2 }}>LETTERHEAD</div>
      <div style={{ height: 168, background: B.paper, border: `1.5px solid ${B.hair}`, padding: 14, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mark size={38} color={B.ink} />
          <div>
            <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: 15, color: B.ink, letterSpacing: -0.2, lineHeight: 1 }}>ROPE ACCESS LOGBOOK</div>
            <div style={{ fontFamily: BFM, fontSize: 8.5, color: B.ink3, letterSpacing: 1.4, marginTop: 2 }}>RALB · FORM 27-A · REV 4 · EFF 2025.03</div>
          </div>
        </div>
        <div style={{ height: 1, background: B.hair }} />
        <div>
          <div style={{ fontFamily: BFD, fontWeight: 800, fontSize: 11, color: B.ink, letterSpacing: 0.5, textTransform: 'uppercase' }}>Operator card — J. Ortiz</div>
          <div style={{ fontFamily: BFB, fontSize: 9, color: B.ink2, lineHeight: 1.4, marginTop: 3 }}>This logbook is offline-first and chained. Each entry is signed and witnessed under SPRAT v3.4 / IRATA ICOP Annex G recordkeeping clauses.</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BFM, fontSize: 7, color: B.ink3, letterSpacing: 1, paddingTop: 4, borderTop: `0.5px solid ${B.hairSoft}` }}>
          <span>OP-44021</span><span>p. 1 / 4</span>
        </div>
      </div>
    </div>);

}

// ── Shared brand system ──────────────────────────────────────────────────────

// Stamps — italic serif, rotated, semi-translucent.
function Stamp({ label, tone = B.green, rot = -6, size = 1 }) {
  return (
    <div style={{ display: 'inline-flex', transform: `rotate(${rot}deg)`, padding: '6px 14px', border: `2.5px solid ${tone}`, color: tone, fontFamily: BFS, fontStyle: 'italic', fontWeight: 700, fontSize: 22 * size, letterSpacing: 3, opacity: 0.78, background: 'transparent' }}>{label}</div>);

}

// Security weave — diagonal hairlines + dots, low-contrast.
function PatternWeave({ size = 240, color = B.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" style={{ background: B.paper, border: `1px solid ${B.hair}` }}>
      <defs>
        <pattern id="weave" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <line x1="-2" y1="22" x2="22" y2="-2" stroke={color} strokeWidth="0.5" opacity="0.18" />
          <line x1="-2" y1="2" x2="22" y2="22" stroke={color} strokeWidth="0.5" opacity="0.18" />
          <circle cx="10" cy="10" r="0.7" fill={color} opacity="0.32" />
        </pattern>
      </defs>
      <rect width="240" height="240" fill="url(#weave)" />
      {/* RALB micro-print, looped */}
      {Array.from({ length: 6 }).map((_, i) =>
      <text key={i} x="120" y={20 + i * 40} textAnchor="middle" fontFamily={BFM} fontSize="6" fill={color} opacity="0.18" letterSpacing="3">RALB · ROPE ACCESS LOGBOOK · RALB · ROPE ACCESS LOGBOOK</text>
      )}
    </svg>);

}

// Watermark seal — pale, large, decorative.
function WatermarkSeal({ size = 200 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <g opacity="0.18">
        <circle cx="100" cy="100" r="90" fill="none" stroke={B.ink} strokeWidth="1.5" />
        <circle cx="100" cy="100" r="80" fill="none" stroke={B.ink} strokeWidth="0.8" />
        <circle cx="100" cy="100" r="62" fill="none" stroke={B.ink} strokeWidth="0.5" />
        {/* perimeter text */}
        <defs><path id="seal-arc" d="M 100 100 m -78 0 a 78 78 0 1 1 156 0 a 78 78 0 1 1 -156 0" /></defs>
        <text fontFamily={BFM} fontSize="9" fill={B.ink} letterSpacing="5">
          <textPath href="#seal-arc">ROPE ACCESS LOGBOOK · FORM 27-A · ROPE ACCESS LOGBOOK · FORM 27-A · </textPath>
        </text>
        {/* center monogram */}
        <text x="100" y="110" textAnchor="middle" fontFamily={BFD} fontWeight="900" fontSize="32" fill={B.ink} letterSpacing="2">RALB</text>
        <line x1="55" y1="118" x2="145" y2="118" stroke={B.ink} strokeWidth="1" />
        <text x="100" y="130" textAnchor="middle" fontFamily={BFM} fontSize="7" fill={B.ink} letterSpacing="2">EST. ANNO IV</text>
        {/* tick marks at compass points */}
        {[0, 90, 180, 270].map((deg) =>
        <line key={deg} x1="100" y1="2" x2="100" y2="12" stroke={B.ink} strokeWidth="1.5" transform={`rotate(${deg} 100 100)`} />
        )}
      </g>
    </svg>);

}

// Loading indicator — animated rope being clipped.
function LoadingIndicator({ size = 96 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', border: `1px solid ${B.hair}`, background: B.paper }}>
      <style>{`
        @keyframes ralb-clip { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(56px); } }
        @keyframes ralb-clip2 { 0%, 100% { transform: translateY(56px); } 50% { transform: translateY(0); } }
        @keyframes ralb-dot { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>
      <svg width={size} height={size} viewBox="0 0 96 96">
        <line x1="34" y1="6" x2="34" y2="90" stroke={B.ink} strokeWidth="1.6" />
        <line x1="62" y1="6" x2="62" y2="90" stroke={B.ink} strokeWidth="1.6" />
        <g style={{ animation: 'ralb-clip 1.6s ease-in-out infinite' }}>
          <rect x="28" y="18" width="12" height="3" fill={B.ink} />
          <circle cx="34" cy="22" r="4" fill={B.yellow} stroke={B.ink} strokeWidth="1.2" />
        </g>
        <g style={{ animation: 'ralb-clip2 1.6s ease-in-out infinite' }}>
          <rect x="56" y="18" width="12" height="3" fill={B.ink} />
          <circle cx="62" cy="22" r="4" fill={B.yellow} stroke={B.ink} strokeWidth="1.2" />
        </g>
      </svg>
      <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontFamily: BFM, fontSize: 7, color: B.ink3, letterSpacing: 1.5 }}>SYNCING…</div>
    </div>);

}

// Empty state illustrations — line art in the system style.
function EmptyNoRecords({ size = 140 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 140 112">
      {/* sheaf of pages */}
      <rect x="36" y="24" width="68" height="80" fill="none" stroke={B.ink} strokeWidth="1.3" />
      <rect x="30" y="20" width="68" height="80" fill={B.paper} stroke={B.ink} strokeWidth="1.3" />
      <rect x="24" y="16" width="68" height="80" fill={B.paper} stroke={B.ink} strokeWidth="1.3" />
      {/* hairlines on top page */}
      {Array.from({ length: 7 }).map((_, i) =>
      <line key={i} x1="30" y1={28 + i * 9} x2="86" y2={28 + i * 9} stroke={B.ink} strokeWidth="0.5" opacity="0.25" />
      )}
      {/* doc band on top page */}
      <rect x="24" y="16" width="68" height="6" fill={B.ink} />
      <text x="58" y="20.5" textAnchor="middle" fontFamily={BFM} fontSize="3.5" fill={B.paper} letterSpacing="0.6">FORM 27-A · REV 4</text>
      {/* stamp */}
      <g transform="rotate(-8 70 70)">
        <rect x="48" y="56" width="44" height="20" fill="none" stroke={B.red} strokeWidth="1.5" opacity="0.7" />
        <text x="70" y="70" textAnchor="middle" fontFamily={BFS} fontStyle="italic" fontWeight="700" fontSize="10" fill={B.red} opacity="0.8" letterSpacing="1.5">UNFILED</text>
      </g>
    </svg>);

}

function EmptyAllSynced({ size = 140 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 140 112">
      {/* hex seal */}
      <path d="M70 14 L102 14 L118 56 L102 98 L70 98 L38 98 L22 56 L38 14 L70 14 Z" fill="none" stroke={B.ink} strokeWidth="1.3" />
      <path d="M70 24 L95 24 L107 56 L95 88 L70 88 L45 88 L33 56 L45 24 L70 24 Z" fill="none" stroke={B.ink} strokeWidth="0.6" opacity="0.45" />
      {/* check */}
      <path d="M48 56 L62 70 L92 40" fill="none" stroke={B.green} strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter" />
      <text x="70" y="105" textAnchor="middle" fontFamily={BFM} fontSize="5.5" fill={B.ink3} letterSpacing="2">CHAIN CONFIRMED</text>
    </svg>);

}

function EmptyNoGear({ size = 140 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 140 112">
      {/* hook + carabiner */}
      <path d="M70 18 Q70 8 78 8 L78 18 L78 30" fill="none" stroke={B.ink} strokeWidth="1.6" />
      <rect x="58" y="30" width="40" height="56" fill="none" stroke={B.ink} strokeWidth="1.8" rx="0" />
      <line x1="58" y1="44" x2="98" y2="44" stroke={B.ink} strokeWidth="1" />
      <circle cx="78" cy="60" r="6" fill="none" stroke={B.ink} strokeWidth="1.4" />
      <circle cx="78" cy="60" r="2" fill={B.ink} />
      {/* hairlines suggesting "missing" */}
      <line x1="24" y1="22" x2="44" y2="22" stroke={B.ink} strokeWidth="1" strokeDasharray="2 2" />
      <line x1="96" y1="22" x2="116" y2="22" stroke={B.ink} strokeWidth="1" strokeDasharray="2 2" />
      <line x1="20" y1="64" x2="40" y2="64" stroke={B.ink} strokeWidth="1" strokeDasharray="2 2" />
      <line x1="100" y1="64" x2="120" y2="64" stroke={B.ink} strokeWidth="1" strokeDasharray="2 2" />
      <text x="70" y="105" textAnchor="middle" fontFamily={BFM} fontSize="5.5" fill={B.ink3} letterSpacing="2">NO PPE LOGGED</text>
    </svg>);

}

function EmptyOffline({ size = 140 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 140 112">
      <rect x="34" y="22" width="72" height="68" fill="none" stroke={B.ink} strokeWidth="1.3" />
      {/* arc-strikes (no-signal) */}
      <path d="M50 76 Q70 60 90 76" fill="none" stroke={B.ink} strokeWidth="1.4" />
      <path d="M44 70 Q70 48 96 70" fill="none" stroke={B.ink} strokeWidth="1.4" />
      <path d="M38 64 Q70 36 102 64" fill="none" stroke={B.ink} strokeWidth="1.4" />
      <line x1="40" y1="40" x2="100" y2="78" stroke={B.red} strokeWidth="2.5" />
      <text x="70" y="105" textAnchor="middle" fontFamily={BFM} fontSize="5.5" fill={B.ink3} letterSpacing="2">QUEUED LOCAL · 7 RECORDS</text>
    </svg>);

}

// ── MOTION ── more animated elements ─────────────────────────────────────────

const MOTION_CSS = `
@keyframes ralb-stamp-slam {
  0%   { transform: translate(-50%, -200%) rotate(-22deg) scale(2.2); opacity: 0; }
  55%  { transform: translate(-50%, -50%)  rotate(-7deg)  scale(1.05); opacity: 1; }
  62%  { transform: translate(-50%, -50%)  rotate(-7deg)  scale(0.96); opacity: 1; }
  70%  { transform: translate(-50%, -50%)  rotate(-7deg)  scale(1.00); opacity: 0.95; }
  100% { transform: translate(-50%, -50%)  rotate(-7deg)  scale(1.00); opacity: 0.78; }
}
@keyframes ralb-stamp-cycle {
  0%, 100% { transform: translate(-50%, -200%) rotate(-22deg) scale(2.2); opacity: 0; }
  20%      { transform: translate(-50%, -50%)  rotate(-7deg)  scale(1.05); opacity: 1; }
  24%      { transform: translate(-50%, -50%)  rotate(-7deg)  scale(0.97); opacity: 1; }
  30%, 88% { transform: translate(-50%, -50%)  rotate(-7deg)  scale(1.00); opacity: 0.78; }
  95%      { transform: translate(-50%, -50%)  rotate(-7deg)  scale(1.00); opacity: 0; }
}
@keyframes ralb-pulley-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes ralb-rope-down { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -22; } }
@keyframes ralb-rope-up   { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 22; } }
@keyframes ralb-load-bob  { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2.5px); } }
@keyframes ralb-roll-1 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-960%); } }
@keyframes ralb-shine { 0%, 8% { transform: translateX(-130%) skewX(-22deg); } 58%, 100% { transform: translateX(240%) skewX(-22deg); } }
@keyframes ralb-rope-twist { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -16; } }
@keyframes ralb-cursor { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes ralb-line-grow { 0% { width: 0; } 100% { width: var(--w, 100%); } }
@keyframes ralb-pulse-ring { 0% { transform: scale(0.6); opacity: 0.7; } 100% { transform: scale(1.6); opacity: 0; } }
@keyframes ralb-pattern-drift { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
@keyframes ralb-seal-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes ralb-needle { 0%, 100% { transform: rotate(-42deg); } 50% { transform: rotate(48deg); } }
@keyframes ralb-bar-fill { 0% { width: 0%; } 100% { width: 100%; } }
@keyframes ralb-tape-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
`;

// Animated stamp landing on a doc
function MotionStampSlam() {
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.paper, overflow: 'hidden' }}>
      {/* doc body */}
      <div style={{ position: 'absolute', inset: 0, padding: '14px 18px' }}>
        <div style={{ fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.4 }}>FORM 27-A · ENTRY 044</div>
        <div style={{ fontFamily: BFD, fontWeight: 800, fontSize: 14, color: B.ink, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 }}>Inspection — 9 May</div>
        {[0, 1, 2, 3, 4].map((i) =>
        <div key={i} style={{ height: 1, background: B.hairSoft, margin: '10px 0' }} />
        )}
      </div>
      <div style={{ position: 'absolute', top: '58%', left: '62%', transformOrigin: 'center', animation: 'ralb-stamp-cycle 3.4s cubic-bezier(.2,.7,.3,1.4) infinite' }}>
        <Stamp label="VERIFIED" tone={B.green} rot={0} />
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>M.1 · STAMP SLAM</div>
    </div>);

}

// Single-sheave pulley with rope draping over a grooved sheave.
function MotionPulley() {
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.paper, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="180" height="196" viewBox="0 0 180 200">
        {/* overhead I-beam */}
        <rect x="10" y="4" width="160" height="7" fill={B.ink} />
        <rect x="10" y="11" width="160" height="1.5" fill={B.ink} opacity="0.45" />
        {Array.from({ length: 11 }).map((_, i) =>
          <line key={i} x1={16 + i * 14} y1="13" x2={10 + i * 14} y2="22" stroke={B.ink} strokeWidth="0.9" opacity="0.5" />
        )}
        {/* anchor sling — tape loop */}
        <path d="M 84 12 L 82 28 Q 82 34 90 34 Q 98 34 98 28 L 96 12" fill="none" stroke={B.ink} strokeWidth="2.8" strokeLinejoin="round" />
        {/* shackle pin connecting sling to housing */}
        <line x1="90" y1="34" x2="90" y2="42" stroke={B.ink} strokeWidth="2.5" />
        <circle cx="90" cy="36" r="1.5" fill={B.paper} stroke={B.ink} strokeWidth="1" />
        {/* pulley housing — outlined cheek plates */}
        <path d="M 60 50 Q 60 42 68 42 L 112 42 Q 120 42 120 50 L 120 92 Q 120 100 112 100 L 68 100 Q 60 100 60 92 Z"
              fill={B.paper} stroke={B.ink} strokeWidth="2.4" />
        {/* inner plate edge — suggests near/far cheek */}
        <path d="M 64 52 Q 64 46 70 46 L 110 46 Q 116 46 116 52 L 116 90 Q 116 96 110 96 L 70 96 Q 64 96 64 90 Z"
              fill="none" stroke={B.ink} strokeWidth="0.8" opacity="0.35" />
        {/* rivet pair */}
        <circle cx="67" cy="95" r="1.6" fill={B.ink} />
        <circle cx="113" cy="95" r="1.6" fill={B.ink} />
        {/* sheave — spins */}
        <g style={{ transformOrigin: '90px 71px', animation: 'ralb-pulley-spin 1.6s linear infinite' }}>
          <circle cx="90" cy="71" r="20" fill={B.paper} stroke={B.ink} strokeWidth="2.4" />
          {/* groove */}
          <circle cx="90" cy="71" r="14.5" fill="none" stroke={B.ink} strokeWidth="0.7" opacity="0.4" />
          {/* spokes (3) */}
          {[0, 60, 120].map(deg =>
            <line key={deg} x1="90" y1="57" x2="90" y2="85" stroke={B.ink} strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${deg} 90 71)`} />
          )}
          {/* hub */}
          <circle cx="90" cy="71" r="5" fill={B.ink} />
          <circle cx="90" cy="71" r="1.6" fill={B.paper} />
        </g>
        {/* rope — single continuous path, draped over sheave */}
        <path d="M 73 200 L 73 71 Q 73 51 90 51 Q 107 51 107 71 L 107 200"
              fill="none" stroke={B.yellow} strokeWidth="7" strokeLinecap="round" />
        {/* rope twist overlay — moves to suggest flow */}
        <path d="M 73 200 L 73 71 Q 73 51 90 51 Q 107 51 107 71 L 107 200"
              fill="none" stroke={B.ink} strokeWidth="7" strokeLinecap="round"
              strokeDasharray="2 6" opacity="0.42"
              style={{ animation: 'ralb-rope-twist 0.9s linear infinite' }} />
        {/* rope shadow on housing edge */}
        <line x1="73" y1="100" x2="73" y2="104" stroke={B.ink} strokeWidth="7" opacity="0.18" />
        <line x1="107" y1="100" x2="107" y2="104" stroke={B.ink} strokeWidth="7" opacity="0.18" />
        {/* load block on left rope */}
        <g style={{ transformOrigin: '73px 175px', animation: 'ralb-load-bob 1.6s ease-in-out infinite' }}>
          <rect x="58" y="162" width="30" height="30" fill={B.ink} />
          <rect x="60" y="164" width="26" height="26" fill="none" stroke={B.paper} strokeWidth="0.5" opacity="0.4" />
          <text x="73" y="174" textAnchor="middle" fontFamily={BFM} fontWeight="600" fontSize="6.5" fill={B.paper} letterSpacing="1.2">LOAD</text>
          <line x1="63" y1="178" x2="83" y2="178" stroke={B.paper} strokeWidth="0.4" opacity="0.4" />
          <text x="73" y="186" textAnchor="middle" fontFamily={BFM} fontWeight="700" fontSize="7.5" fill={B.yellow} letterSpacing="0.6">8 kN</text>
        </g>
        {/* haul-side direction arrow */}
        <polygon points="122,170 116,165 116,175" fill={B.ink} opacity="0.55" />
      </svg>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>M.2 · PULLEY · ROPE FLOW</div>
      <div style={{ position: 'absolute', bottom: 8, right: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>2:1 SYSTEM</div>
    </div>);

}

// Rolling ledger counter (slot-style)
function RollDigit({ delay = 0 }) {
  return (
    <span style={{ display: 'inline-block', width: 14, height: 22, overflow: 'hidden', verticalAlign: 'middle', background: B.paper, border: `0.5px solid ${B.hairSoft}` }}>
      <span style={{ display: 'inline-flex', flexDirection: 'column', animation: `ralb-roll-1 4s cubic-bezier(.5,.1,.5,1) ${delay}s infinite`, fontFamily: BFM, fontSize: 16, color: B.ink, lineHeight: '22px' }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, i) =>
        <span key={i} style={{ width: 14, textAlign: 'center' }}>{n}</span>
        )}
      </span>
    </span>);

}
function MotionLedgerCounter() {
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.paper, overflow: 'hidden', padding: '20px 18px' }}>
      <div style={{ fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.4 }}>TOTAL ROPE-HOURS · OP-44021</div>
      <div style={{ marginTop: 6, display: 'flex', gap: 2, alignItems: 'baseline' }}>
        {[0, 1, 2, 3, 4].map((i) => <RollDigit key={i} delay={i * 0.18} />)}
        <span style={{ fontFamily: BFM, fontSize: 16, color: B.ink, lineHeight: '22px', margin: '0 1px' }}>·</span>
        <RollDigit delay={1.0} />
        <span style={{ fontFamily: BFM, fontSize: 11, color: B.ink3, marginLeft: 6, letterSpacing: 1.2 }}>HR</span>
      </div>
      <div style={{ marginTop: 16, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.4 }}>RECORDS WRITTEN</div>
      <div style={{ marginTop: 6, display: 'flex', gap: 2, alignItems: 'baseline' }}>
        {[0, 1, 2].map((i) => <RollDigit key={i} delay={0.4 + i * 0.18} />)}
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>M.3 · LEDGER COUNTERS</div>
    </div>);

}

// Animated splash — full plate logo reveals, rope-clip syncs underneath
function MotionSplash() {
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.ink, overflow: 'hidden', color: B.paper }}>
      {/* polished-plate shine sweep — multi-stop, skewed, with a hot center streak */}
      <div style={{ position: 'absolute', top: -20, bottom: -20, left: 0, width: '55%', background: 'linear-gradient(95deg, transparent 0%, rgba(245,197,24,0.00) 28%, rgba(245,197,24,0.22) 42%, rgba(255,236,170,0.55) 49%, rgba(255,255,255,0.78) 50%, rgba(255,236,170,0.55) 51%, rgba(245,197,24,0.22) 58%, rgba(245,197,24,0.00) 72%, transparent 100%)', mixBlendMode: 'screen', animation: 'ralb-shine 4s cubic-bezier(.42,.0,.58,1) infinite' }} />
      {/* subtle ambient warm wash, fixed */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 110%, rgba(245,197,24,0.10), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ transform: 'scale(2.2)' }}>
          <MarkPlate size={72} color={B.ink} />
        </div>
        <div style={{ fontFamily: BFM, fontSize: 9, color: 'rgba(246,243,235,0.6)', letterSpacing: 2.4, marginTop: 16 }}>SYNCING CHAIN…</div>
        <div style={{ width: 180, height: 3, background: 'rgba(246,243,235,0.18)', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: B.yellow, animation: 'ralb-bar-fill 3.2s ease-out infinite' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: 'rgba(246,243,235,0.6)', letterSpacing: 1.2 }}>M.4 · SPLASH</div>
    </div>);

}

// Rotating seal w/ pulsing dot center
function MotionSeal() {
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.paper, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <div style={{ position: 'absolute', inset: 0, animation: 'ralb-seal-spin 24s linear infinite' }}>
          <WatermarkSeal size={160} />
        </div>
        {/* pulse rings */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: '50%', border: `1.5px solid ${B.green}`, animation: 'ralb-pulse-ring 1.8s ease-out infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: '50%', border: `1.5px solid ${B.green}`, animation: 'ralb-pulse-ring 1.8s ease-out 0.9s infinite' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', background: B.green }} />
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>M.5 · SEAL CHAIN-OK</div>
    </div>);

}

// Drifting security weave
function MotionWeaveDrift() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><line x1='-2' y1='22' x2='22' y2='-2' stroke='%230b2545' stroke-width='0.5' opacity='0.28'/><line x1='-2' y1='2' x2='22' y2='22' stroke='%230b2545' stroke-width='0.5' opacity='0.28'/><circle cx='10' cy='10' r='0.7' fill='%230b2545' opacity='0.42'/></svg>`;
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: `${B.paper} url("data:image/svg+xml;utf8,${svg}")`, backgroundRepeat: 'repeat', animation: 'ralb-pattern-drift 6s linear infinite', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at center, transparent 30%, ${B.paper} 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MarkPlate size={92} color={B.ink} />
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>M.6 · WEAVE DRIFT</div>
    </div>);

}

// Anemometer / load-gauge needle
function MotionGauge() {
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.paper, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="180" height="140" viewBox="0 0 180 140">
        <path d="M20 110 A70 70 0 0 1 160 110" fill="none" stroke={B.ink} strokeWidth="1.4" />
        <path d="M20 110 A70 70 0 0 1 60 51" fill="none" stroke={B.green} strokeWidth="3" />
        <path d="M60 51 A70 70 0 0 1 120 51" fill="none" stroke={B.yellow} strokeWidth="3" />
        <path d="M120 51 A70 70 0 0 1 160 110" fill="none" stroke={B.red} strokeWidth="3" />
        {Array.from({ length: 11 }).map((_, i) => {
          const a = Math.PI * i / 10;
          const x1 = 90 - Math.cos(a) * 70,y1 = 110 - Math.sin(a) * 70;
          const x2 = 90 - Math.cos(a) * 64,y2 = 110 - Math.sin(a) * 64;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={B.ink} strokeWidth="1" />;
        })}
        <g style={{ transformOrigin: '90px 110px', animation: 'ralb-needle 3.6s ease-in-out infinite' }}>
          <line x1="90" y1="110" x2="90" y2="48" stroke={B.ink} strokeWidth="2" />
          <polygon points="86,110 94,110 90,46" fill={B.ink} />
        </g>
        <circle cx="90" cy="110" r="6" fill={B.ink} />
        <circle cx="90" cy="110" r="2" fill={B.yellow} />
        <text x="90" y="130" textAnchor="middle" fontFamily={BFM} fontSize="7" fill={B.ink3} letterSpacing="1.8">LOAD · kN</text>
      </svg>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>M.7 · LOAD GAUGE</div>
    </div>);

}

// Form-field type-out (signature line filling)
function MotionFormFill() {
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.paper, overflow: 'hidden', padding: '20px 22px' }}>
      <div style={{ fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.4 }}>SIGN BLOCK · OP-44021</div>
      <div style={{ marginTop: 18 }}>
        <div style={{ fontFamily: BFD, fontWeight: 700, fontSize: 10, color: B.ink, letterSpacing: 1.2, textTransform: 'uppercase' }}>Operator</div>
        <div style={{ position: 'relative', height: 22, borderBottom: `1.5px solid ${B.ink}` }}>
          <div style={{ position: 'absolute', left: 0, bottom: 4, height: 14, '--w': '60%', width: 0, animation: 'ralb-line-grow 2.4s ease-out infinite', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 17, color: B.ink }}>J. Ortiz</div>
        </div>
        <div style={{ fontFamily: BFD, fontWeight: 700, fontSize: 10, color: B.ink, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 12 }}>Witness</div>
        <div style={{ position: 'relative', height: 22, borderBottom: `1.5px solid ${B.ink}` }}>
          <div style={{ position: 'absolute', left: 0, bottom: 4, height: 14, '--w': '52%', width: 0, animation: 'ralb-line-grow 2.4s ease-out 0.9s infinite', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 17, color: B.ink }}>K. Briggs</div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: B.ink3, letterSpacing: 1.2 }}>M.8 · SIGNATURE FILL</div>
    </div>);

}

// Telex / ticker tape scroll
function MotionTickerTape() {
  const msg = '· ENTRY 047 SIGNED · CHAIN HEAD 3f9a1c…b820 · 612.5 ROPE-HR · WITNESSED BY IR-30219 · 9 SITES ACTIVE · SPRAT v3.4 · IRATA ICOP ';
  return (
    <div style={{ position: 'relative', height: 200, border: `1px solid ${B.hair}`, background: B.ink, overflow: 'hidden', color: B.paper, padding: '20px 0 0' }}>
      <div style={{ fontFamily: BFM, fontSize: 9, color: 'rgba(246,243,235,0.65)', letterSpacing: 1.4, padding: '0 22px' }}>FORM 99-T · TELEX BAND</div>
      <div style={{ marginTop: 14, height: 26, background: B.paper, color: B.ink, position: 'relative', overflow: 'hidden', borderTop: `0.5px solid ${B.yellow}`, borderBottom: `0.5px solid ${B.yellow}` }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ralb-tape-scroll 22s linear infinite', height: '100%', alignItems: 'center', fontFamily: BFM, fontSize: 12, letterSpacing: 1.6 }}>
          <span>{msg}{msg}{msg}{msg}</span>
        </div>
      </div>
      <div style={{ marginTop: 14, height: 26, background: B.paper2, color: B.ink2, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ralb-tape-scroll 36s linear infinite reverse', height: '100%', alignItems: 'center', fontFamily: BFM, fontSize: 10, letterSpacing: 1.4 }}>
          <span>{msg}{msg}{msg}{msg}</span>
        </div>
      </div>
      <div style={{ marginTop: 14, height: 16, background: B.yellow, color: B.ink, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ralb-tape-scroll 28s linear infinite', height: '100%', alignItems: 'center', fontFamily: BFM, fontWeight: 600, fontSize: 9, letterSpacing: 1.8 }}>
          <span>{msg}{msg}{msg}{msg}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontFamily: BFM, fontSize: 8, color: 'rgba(246,243,235,0.6)', letterSpacing: 1.2 }}>M.9 · TICKER TAPE</div>
    </div>);

}

// ── Page ─────────────────────────────────────────────────────────────────────
function BrandSheet() {
  return (
    <div style={{ background: B.paper2, minHeight: '100vh', padding: '32px 0', color: B.ink, fontFamily: BFB }}>
      <div style={{ width: 1280, margin: '0 auto', background: B.paper, border: `1px solid ${B.hair}` }}>

        {/* Master doc band */}
        <div style={{ background: B.ink, color: B.paper, padding: '8px 32px', display: 'flex', justifyContent: 'space-between', fontFamily: BFM, fontSize: 10, letterSpacing: 1.1 }}>
          <span>FORM BR-01 · BRAND EXPLORATION · REV 1</span>
          <span>EFF 2026.05 · CONFIDENTIAL</span>
        </div>

        {/* Title block */}
        <div style={{ padding: '28px 32px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${B.hair}` }}>
          <div>
            <div style={{ fontFamily: BFB, fontSize: 11, color: B.ink3, letterSpacing: 2.2, textTransform: 'uppercase' }}>Identity system · Tidewater palette</div>
            <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: 48, color: B.ink, letterSpacing: -0.8, lineHeight: 0.95, marginTop: 4 }}>BRAND SYSTEM</div>
            <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: 48, color: B.ink, letterSpacing: -0.8, lineHeight: 0.95 }}>ROPE ACCESS LOGBOOK</div>
            <div style={{ fontFamily: BFB, fontSize: 13, color: B.ink2, marginTop: 12, maxWidth: 720, lineHeight: 1.55 }}>The PLATE mark — a riveted equipment nameplate — paired with a shared system: stamps, security weave, watermark, motion, and empty-state line art. All built to live inside the regulated-document aesthetic of the redesigned app.</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: BFM, fontSize: 10, color: B.ink3, letterSpacing: 1.5 }}>SHEET 01 / 01</div>
            <div style={{ fontFamily: BFM, fontSize: 10, color: B.ink3, letterSpacing: 1.5, marginTop: 2 }}>2026.05.11</div>
            <div style={{ fontFamily: BFM, fontSize: 10, color: B.ink3, letterSpacing: 1.5, marginTop: 2 }}>OP-44021 / J. ORTIZ</div>
          </div>
        </div>

        {/* Directions */}
        <div>
          <SectionHeader label="A · LOGO" right="Plate direction · paired with ROPE ACCESS LOGBOOK / RALB lockup" />
          {DIRECTIONS.map((d, i) => <DirectionRow key={d.id} dir={d} idx={i} />)}
        </div>

        {/* Shared brand system */}
        <div style={{ borderTop: `1px solid ${B.hair}` }}>
          <SectionHeader label="B · SHARED SYSTEM" right="Applies to all directions" />

          <div style={{ padding: '20px 32px 32px' }}>
            {/* Stamps */}
            <SubHeader n="B.1" title="Document stamps" hint="Newsreader italic · rotated · 78% opacity over content" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, padding: '14px 0', alignItems: 'center' }}>
              <Stamp label="VERIFIED" tone={B.green} rot={-6} />
              <Stamp label="SIGNED" tone={B.ink} rot={-3} />
              <Stamp label="WITNESSED" tone={B.ink} rot={-7} />
              <Stamp label="FILED" tone={B.green} rot={4} />
              <Stamp label="PENDING" tone={B.yellowDeep} rot={-5} />
              <Stamp label="AMENDED" tone={B.ink2} rot={6} />
              <Stamp label="VOID" tone={B.red} rot={-9} />
              <Stamp label="EXPIRED" tone={B.red} rot={5} />
              <Stamp label="DRAFT" tone={B.ink3} rot={-2} />
            </div>

            {/* Pattern */}
            <SubHeader n="B.2" title="Security weave" hint="Background for sensitive screens, audit-PDF backers, splash screen" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
              <PatternWeave size={240} color={B.ink} />
              <div style={{ background: B.ink, border: `1px solid ${B.hair}`, position: 'relative', overflow: 'hidden' }}>
                <PatternWeave size={240} color={B.paper} />
              </div>
              <PatternWeave size={240} color={B.yellowDeep} />
            </div>

            {/* Watermark */}
            <SubHeader n="B.3" title="Watermark seal" hint="Pale center mark on cover pages / audit-PDF first page" />
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 22, marginTop: 12, alignItems: 'flex-start' }}>
              <div style={{ border: `1px solid ${B.hair}`, background: B.paper, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WatermarkSeal size={210} />
              </div>
              <div style={{ position: 'relative', border: `1px solid ${B.hair}`, background: B.paper, padding: '20px 26px', minHeight: 260, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)' }}>
                  <WatermarkSeal size={260} />
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: BFM, fontSize: 9, color: B.ink3, letterSpacing: 1.5 }}>FORM 12-B · REV 7</div>
                  <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: 22, color: B.ink, letterSpacing: -0.2, marginTop: 4 }}>RECORDS LEDGER — 2026 EXPORT</div>
                  <div style={{ height: 1, background: B.hair, margin: '10px 0' }} />
                  <div style={{ fontFamily: BFB, fontSize: 11, color: B.ink2, lineHeight: 1.55, maxWidth: 480 }}>This audit PDF contains 47 chained entries from 04 JAN 2026 to 09 MAY 2026, signed by operator OP-44021 (J. Ortiz) and witnessed by IR-30219 (K. Briggs). Chain head: 3f9a1c…b820.</div>
                  <div style={{ marginTop: 14, display: 'flex', gap: 16, fontFamily: BFM, fontSize: 10, color: B.ink2 }}>
                    <span>47 RECORDS</span><span>·</span><span>612.5 ROPE-HR</span><span>·</span><span>9 SITES</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loading */}
            <SubHeader n="B.4" title="Sync indicator" hint="Replaces the system spinner — clip-on-rope animation, 1.6s loop" />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'flex-end' }}>
              <LoadingIndicator size={96} />
              <LoadingIndicator size={64} />
              <LoadingIndicator size={48} />
              <div style={{ flex: 1, padding: '14px 16px', background: B.paper2, border: `1px solid ${B.hairSoft}`, alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 14 }}>
                <LoadingIndicator size={56} />
                <div>
                  <div style={{ fontFamily: BFD, fontWeight: 800, fontSize: 13, color: B.ink, letterSpacing: 0.5, textTransform: 'uppercase' }}>Syncing to chain</div>
                  <div style={{ fontFamily: BFM, fontSize: 10, color: B.ink3, letterSpacing: 1, marginTop: 2 }}>3 of 7 records · est. 4s · Wi-Fi · last 14:02</div>
                </div>
              </div>
            </div>

            {/* Empty states */}
            <SubHeader n="B.5" title="Empty states" hint="Line-art only, monospace caption, sized 140×112" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
              <EmptyTile title="No records yet" caption="Open your first entry to start the chain." Illo={EmptyNoRecords} />
              <EmptyTile title="All synced" caption="Chain confirmed. You are caught up." Illo={EmptyAllSynced} />
              <EmptyTile title="No PPE on file" caption="Add gear to enable inspection schedule." Illo={EmptyNoGear} />
              <EmptyTile title="Offline" caption="Records queued. Will sync when online." Illo={EmptyOffline} />
            </div>
          </div>
        </div>

        {/* Motion */}
        <div style={{ borderTop: `1px solid ${B.hair}` }}>
          <style>{MOTION_CSS}</style>
          <SectionHeader label="C · MOTION SYSTEM" right="All loops — paired with the PLATE direction" />
          <div style={{ padding: '20px 32px 32px' }}>
            <div style={{ fontFamily: BFB, fontSize: 12, color: B.ink2, lineHeight: 1.55, maxWidth: 720, marginBottom: 18 }}>The brand moves like a piece of equipment — short, mechanical loops, no easing tricks. Each motion has a single job: confirm an action, count the work, or signal sync status.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <MotionStampSlam />
              <MotionPulley />
              <MotionLedgerCounter />
              <MotionSplash />
              <MotionSeal />
              <MotionWeaveDrift />
              <MotionGauge />
              <MotionFormFill />
              <MotionTickerTape />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${B.hair}`, background: B.paper2, padding: '8px 32px', display: 'flex', justifyContent: 'space-between', fontFamily: BFM, fontSize: 9, color: B.ink2, letterSpacing: 1 }}>
          <span>Issued under SPRAT v3.4 / IRATA ICOP Annex G recordkeeping clauses · marks abstract, non-affiliated</span>
          <span>p. 1 / 1</span>
        </div>
      </div>
    </div>);

}

function SectionHeader({ label, right }) {
  return (
    <div style={{ background: B.paper2, padding: '10px 32px', borderTop: `1px solid ${B.hair}`, display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ fontFamily: BFD, fontWeight: 900, fontSize: 13, color: B.ink, letterSpacing: 2 }}>{label}</div>
      <div style={{ fontFamily: BFB, fontSize: 11, color: B.ink3, letterSpacing: 0.5 }}>{right}</div>
    </div>);

}

function SubHeader({ n, title, hint }) {
  return (
    <div style={{ marginTop: 22, borderBottom: `1px solid ${B.hair}`, paddingBottom: 6, display: 'flex', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontFamily: BFM, fontSize: 10, color: B.ink3, letterSpacing: 1 }}>{n}</span>
      <span style={{ fontFamily: BFD, fontWeight: 800, fontSize: 16, color: B.ink, letterSpacing: -0.1 }}>{title}</span>
      <span style={{ fontFamily: BFB, fontSize: 11, color: B.ink3, flex: 1 }}>{hint}</span>
    </div>);

}

function EmptyTile({ title, caption, Illo }) {
  return (
    <div style={{ border: `1px solid ${B.hair}`, background: B.paper, padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Illo size={140} />
      <div style={{ fontFamily: BFD, fontWeight: 800, fontSize: 13, color: B.ink, letterSpacing: 0.3, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontFamily: BFB, fontSize: 11, color: B.ink3, textAlign: 'center', lineHeight: 1.4 }}>{caption}</div>
    </div>);

}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<BrandSheet />);