// Shared primitives for the RALKREDUX prototype.
// All visuals are token-driven so they re-skin with theme.

const cx = (...xs) => xs.filter(Boolean).join(' ');

// --- Format helpers ---------------------------------------------------
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateShort = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};
const fmtHours = (h) => (Math.round(h * 10) / 10).toFixed(1).replace(/\.0$/, '');

// --- Status pill -------------------------------------------------------
function StatusPill({ status, size = 'sm' }) {
  const cfg = {
    draft: { label: 'Draft', icon: window.IconDraft, tone: 'warn' },
    signed: { label: 'Signed', icon: window.IconVerified, tone: 'ok' },
    amended: { label: 'Amended', icon: window.IconVoid, tone: 'danger' },
    pending: { label: 'Pending', icon: window.IconPending, tone: 'warn' },
    void: { label: 'Void', icon: window.IconVoid, tone: 'danger' },
  }[status] || { label: status, icon: window.IconPending, tone: 'warn' };
  const Icon = cfg.icon;
  return (
    <span
      className={cx('rk-pill', `rk-pill--${cfg.tone}`, `rk-pill--${size}`)}
      style={{ '--pill-tone': `var(--${cfg.tone})`, '--pill-soft': `var(--${cfg.tone}Soft)` }}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      {cfg.label}
    </span>
  );
}

// --- Tone pill (generic) ----------------------------------------------
function Pill({ tone = 'chip', children, icon: Icon, size = 'sm' }) {
  return (
    <span
      className={cx('rk-pill', `rk-pill--${tone}`, `rk-pill--${size}`)}
      style={{ '--pill-tone': `var(--${tone}, var(--text))`, '--pill-soft': `var(--${tone}Soft, var(--chip))` }}
    >
      {Icon ? <Icon size={size === 'sm' ? 12 : 14} /> : null}
      {children}
    </span>
  );
}

// --- Card -------------------------------------------------------------
function Card({ children, padding = 16, interactive, onClick, style, className }) {
  return (
    <div
      className={cx('rk-card', interactive && 'rk-card--interactive', className)}
      style={{ padding, ...style }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  );
}

// --- Button -----------------------------------------------------------
function Button({ variant = 'primary', size = 'md', icon: Icon, iconRight: IR, children, onClick, full, disabled, style }) {
  return (
    <button
      type="button"
      className={cx('rk-btn', `rk-btn--${variant}`, `rk-btn--${size}`, full && 'rk-btn--full')}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {Icon ? <Icon size={size === 'lg' ? 20 : 16} /> : null}
      <span>{children}</span>
      {IR ? <IR size={size === 'lg' ? 20 : 16} /> : null}
    </button>
  );
}

// --- Icon button ------------------------------------------------------
function IconBtn({ icon: Icon, label, onClick, tone, size = 'md' }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx('rk-iconbtn', `rk-iconbtn--${size}`)}
      onClick={onClick}
      style={tone ? { color: `var(--${tone})` } : undefined}
    >
      <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
    </button>
  );
}

// --- Section header ---------------------------------------------------
function SectionH({ title, action, kicker }) {
  return (
    <div className="rk-sech">
      <div className="rk-sech__main">
        {kicker ? <div className="rk-sech__kicker">{kicker}</div> : null}
        <h3 className="rk-sech__title">{title}</h3>
      </div>
      {action || null}
    </div>
  );
}

// --- Top app bar ------------------------------------------------------
function TopBar({ title, leading, trailing, large, subtitle }) {
  return (
    <div className={cx('rk-topbar', large && 'rk-topbar--large')}>
      <div className="rk-topbar__row">
        <div className="rk-topbar__leading">{leading || null}</div>
        {!large ? <h1 className="rk-topbar__title">{title}</h1> : <div />}
        <div className="rk-topbar__trailing">{trailing || null}</div>
      </div>
      {large ? (
        <div className="rk-topbar__hero">
          <h1 className="rk-topbar__hero-title">{title}</h1>
          {subtitle ? <div className="rk-topbar__hero-sub">{subtitle}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

// --- Tab bar ----------------------------------------------------------
function TabBar({ active, onChange, onNewPress, hasInsetHome = true }) {
  const items = [
    { id: 'today', label: 'Today', Icon: window.IconToday },
    { id: 'records', label: 'Records', Icon: window.IconRecords },
    { id: 'new', label: '', Icon: window.IconPlus, primary: true },
    { id: 'gear', label: 'Gear', Icon: window.IconGear },
    { id: 'profile', label: 'Profile', Icon: window.IconProfile },
  ];
  return (
    <nav className={cx('rk-tabs', hasInsetHome && 'rk-tabs--inset')}>
      {items.map((it) => {
        const isActive = active === it.id;
        if (it.primary) {
          return (
            <button
              key={it.id}
              type="button"
              className="rk-tabs__primary"
              onClick={onNewPress}
              aria-label="New record"
            >
              <span className="rk-tabs__primary-disk"><it.Icon size={26} /></span>
            </button>
          );
        }
        return (
          <button
            key={it.id}
            type="button"
            className={cx('rk-tabs__item', isActive && 'rk-tabs__item--active')}
            onClick={() => onChange(it.id)}
          >
            <it.Icon size={22} />
            <span className="rk-tabs__label">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// --- Sync chip --------------------------------------------------------
function SyncChip({ state, count, onPress }) {
  const map = {
    synced: { label: 'Synced', Icon: window.IconCheck, tone: 'ok' },
    syncing: { label: 'Syncing…', Icon: window.IconSync, tone: 'accent' },
    queued: { label: `Queued · ${count || 0}`, Icon: window.IconSync, tone: 'warn' },
    offline: { label: 'Offline', Icon: window.IconOffline, tone: 'danger' },
  };
  const s = map[state] || map.synced;
  return (
    <button type="button" className={cx('rk-syncchip', `rk-syncchip--${state}`)} onClick={onPress}>
      <s.Icon size={14} />
      <span>{s.label}</span>
    </button>
  );
}

// --- Animated counter -------------------------------------------------
function AnimatedNumber({ value, duration = 900, fmt = (v) => Math.round(v).toString(), className, style }) {
  const [display, setDisplay] = React.useState(value);
  const prev = React.useRef(value);
  React.useEffect(() => {
    let raf;
    const from = prev.current;
    const to = value;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className} style={style}>{fmt(display)}</span>;
}

// --- Hash glyph (chain visualization atom) ----------------------------
// 8-char hex → 8 small bars whose height & color is data-derived.
function HashGlyph({ hash, size = 22, gap = 2 }) {
  const chars = (hash || '00000000').slice(0, 8);
  const bars = [...chars].map((c) => parseInt(c, 16));
  const w = (size - gap * 7) / 8;
  return (
    <span className="rk-hashglyph" style={{ height: size, gap }}>
      {bars.map((v, i) => (
        <span
          key={i}
          style={{
            width: w,
            height: `${20 + (v / 15) * 80}%`,
            background: i % 3 === 0 ? 'var(--accent)' : 'var(--textDim)',
            opacity: 0.4 + (v / 15) * 0.6,
            borderRadius: 1,
          }}
        />
      ))}
    </span>
  );
}

// --- Sheet / Modal ----------------------------------------------------
function Sheet({ open, onClose, children, height = 'auto', title, trailing }) {
  if (!open) return null;
  return (
    <div className="rk-sheet-root" onClick={onClose}>
      <div className="rk-sheet-scrim" />
      <div
        className="rk-sheet"
        style={{ height }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rk-sheet__grab" />
        {title ? (
          <div className="rk-sheet__head">
            <h2 className="rk-sheet__title">{title}</h2>
            {trailing || <IconBtn icon={window.IconClose} label="Close" onClick={onClose} />}
          </div>
        ) : null}
        <div className="rk-sheet__body">{children}</div>
      </div>
    </div>
  );
}

// --- Form field -------------------------------------------------------
function Field({ label, value, onChange, placeholder, multiline, suffix, helper, type = 'text', readOnly }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label className="rk-field">
      <span className="rk-field__label">{label}</span>
      <span className="rk-field__row">
        <Tag
          type={type}
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="rk-field__input"
          rows={multiline ? 3 : undefined}
        />
        {suffix ? <span className="rk-field__suffix">{suffix}</span> : null}
      </span>
      {helper ? <span className="rk-field__helper">{helper}</span> : null}
    </label>
  );
}

// --- Chip select (segmented-ish row) -----------------------------------
function ChipSelect({ value, options, onChange }) {
  return (
    <div className="rk-chipsel">
      {options.map((o) => (
        <button
          key={o.value || o}
          type="button"
          className={cx('rk-chipsel__item', (o.value || o) === value && 'rk-chipsel__item--active')}
          onClick={() => onChange(o.value || o)}
        >
          {o.label || o}
        </button>
      ))}
    </div>
  );
}

// --- Pull to refresh -------------------------------------------------
function PullToRefresh({ children, onRefresh }) {
  const ref = React.useRef(null);
  const [pull, setPull] = React.useState(0);     // current pull distance
  const [state, setState] = React.useState('idle'); // 'idle' | 'pulling' | 'ready' | 'refreshing'
  const startY = React.useRef(0);
  const armed = React.useRef(false);
  const THRESH = 72;

  const onTouchStart = (e) => {
    if (state === 'refreshing') return;
    const t = e.touches ? e.touches[0] : e;
    if (ref.current.scrollTop > 0) { armed.current = false; return; }
    armed.current = true;
    startY.current = t.clientY;
  };
  const onTouchMove = (e) => {
    if (!armed.current || state === 'refreshing') return;
    const t = e.touches ? e.touches[0] : e;
    const dy = t.clientY - startY.current;
    if (dy <= 0) { setPull(0); setState('idle'); return; }
    const eased = Math.min(120, Math.pow(dy, 0.86));
    setPull(eased);
    setState(eased > THRESH ? 'ready' : 'pulling');
    if (e.cancelable) e.preventDefault();
  };
  const onTouchEnd = () => {
    if (!armed.current) return;
    armed.current = false;
    if (state === 'ready') {
      setState('refreshing');
      setPull(56);
      const done = () => {
        setState('idle');
        setPull(0);
      };
      if (onRefresh) Promise.resolve(onRefresh()).then(() => setTimeout(done, 600));
      else setTimeout(done, 1100);
    } else {
      setState('idle');
      setPull(0);
    }
  };

  const labels = {
    idle: 'Pull to refresh',
    pulling: 'Pull to refresh',
    ready: 'Release to sync',
    refreshing: 'Syncing chain…',
  };
  const progress = Math.min(1, pull / THRESH);

  return (
    <div
      ref={ref}
      className="rk-screen"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onTouchStart}
      onMouseMove={(e) => e.buttons ? onTouchMove(e) : null}
      onMouseUp={onTouchEnd}
      onMouseLeave={onTouchEnd}
      style={{ position: 'relative', touchAction: state === 'idle' ? 'pan-y' : 'none' }}
    >
      {/* Refresh indicator */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 60, display: 'grid', placeItems: 'center',
        pointerEvents: 'none', zIndex: 1,
        opacity: pull > 4 || state === 'refreshing' ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}>
        <PullIndicator progress={progress} active={state === 'refreshing'} label={labels[state]} />
      </div>
      <div style={{
        transform: `translateY(${pull}px)`,
        transition: state === 'idle' || state === 'refreshing' ? 'transform 320ms cubic-bezier(.2,.7,.3,1)' : 'none',
      }}>
        {children}
      </div>
    </div>
  );
}

function PullIndicator({ progress, active, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 60 }}>
      <div style={{
        width: 28, height: 28, position: 'relative',
        color: 'var(--accent)', '--icon-fill': 'currentColor',
      }}>
        {/* arc that fills as you pull */}
        <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="14" cy="14" r="11" fill="none" stroke="var(--lineSoft)" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="11" fill="none" stroke="var(--accent)" strokeWidth="2"
            strokeDasharray={2 * Math.PI * 11}
            strokeDashoffset={2 * Math.PI * 11 * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 80ms linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          animation: active ? 'rk-spin 1.4s linear infinite' : 'none',
        }}>
          <window.IconChain size={14} />
        </div>
      </div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--textDim)', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}
// --- Empty state -----------------------------------------------------
function EmptyState({ icon: Icon = window.IconBrand, title, sub, action }) {
  return (
    <div style={{
      padding: '40px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
      textAlign: 'center',
    }}>
      <div style={{
        width: 88, height: 88, borderRadius: 24,
        background: 'var(--surface2)',
        display: 'grid', placeItems: 'center',
        color: 'var(--textDim)',
        '--icon-fill': 'var(--accent)',
        position: 'relative',
      }}>
        {/* concentric rings — quiet ceremony for an empty state */}
        <svg width="88" height="88" viewBox="0 0 88 88" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="44" cy="44" r="40" fill="none" stroke="var(--lineSoft)" strokeWidth="1" strokeDasharray="2 4" />
          <circle cx="44" cy="44" r="30" fill="none" stroke="var(--lineSoft)" strokeWidth="1" />
        </svg>
        <div style={{ position: 'relative' }}>
          <Icon size={36} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em' }}>{title}</div>
        {sub ? <div style={{ marginTop: 6, fontSize: 13, color: 'var(--textDim)', maxWidth: 260, lineHeight: 1.45 }}>{sub}</div> : null}
      </div>
      {action || null}
    </div>
  );
}

Object.assign(window, {
  cx, fmtDate, fmtDateShort, fmtTime, fmtHours,
  StatusPill, Pill, Card, Button, IconBtn, SectionH, TopBar, TabBar,
  SyncChip, AnimatedNumber, HashGlyph, Sheet, Field, ChipSelect, EmptyState,
  PullToRefresh, PullIndicator,
});
