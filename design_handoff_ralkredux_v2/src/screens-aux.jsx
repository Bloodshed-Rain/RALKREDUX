// Screens: Gear, Audit Export, Profile/Settings

function GearScreen({ onAdd, onOpen }) {
  const [cat, setCat] = React.useState('all');
  const counts = window.MOCK_GEAR.reduce((acc, g) => { acc[g.status] = (acc[g.status] || 0) + 1; return acc; }, {});
  const overdue = window.MOCK_GEAR.filter((g) => g.status === 'overdue');
  const dueSoon = window.MOCK_GEAR.filter((g) => g.status === 'due_soon');
  const items = window.MOCK_GEAR.filter((g) => cat === 'all' ? true : g.category === cat);

  return (
    <div className="rk-screen">
      <window.TopBar
        large
        title="Gear"
        subtitle={`${window.MOCK_GEAR.length} items · ${counts.overdue || 0} overdue · ${counts.due_soon || 0} due soon`}
        leading={<window.IconBtn icon={window.IconGear} label="Gear" />}
        trailing={<window.IconBtn icon={window.IconPlus} label="Add gear" onClick={onAdd} />}
      />
      <div className="rk-screen-inner">
        {/* Inspection summary */}
        {overdue.length > 0 || dueSoon.length > 0 ? (
          <div style={{ padding: '4px 20px 16px' }}>
            <div className="rk-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
                    Inspection deadlines
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {overdue.length} overdue · {dueSoon.length} due ≤14d
                  </h3>
                </div>
                <window.IconWarn size={22} />
              </div>
              {[...overdue, ...dueSoon].slice(0, 3).map((g) => {
                const Icon = window[window.GEAR_ICON[g.category]] || window.IconCarabiner;
                const isOverdue = g.status === 'overdue';
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 10px', borderRadius: 10,
                    background: isOverdue ? 'var(--dangerSoft)' : 'var(--warnSoft)',
                    color: isOverdue ? 'var(--danger)' : 'var(--warn)',
                    '--icon-fill': 'currentColor',
                  }}>
                    <Icon size={20} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{g.name}</div>
                      <div className="mono" style={{ fontSize: 11, opacity: 0.85 }}>
                        {isOverdue ? `${Math.abs(g.days_to_inspection)}d overdue` : `${g.days_to_inspection}d to inspect`} · {window.fmtDateShort(g.next_inspection_due)}
                      </div>
                    </div>
                    <window.IconChevron size={14} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Category filter */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ display: 'flex', gap: 6, overflow: 'auto', paddingBottom: 4 }}>
            {[
              { value: 'all', label: 'All' },
              { value: 'harness', label: 'Harness' },
              { value: 'helmet', label: 'Helmet' },
              { value: 'rope', label: 'Rope' },
              { value: 'descender', label: 'Descender' },
              { value: 'ascender', label: 'Ascender' },
              { value: 'carabiner', label: 'Carabiner' },
              { value: 'lanyard', label: 'Lanyard' },
              { value: 'pulley', label: 'Pulley' },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setCat(o.value)}
                className={'rk-chipsel__item ' + (o.value === cat ? 'rk-chipsel__item--active' : '')}
                style={{ flexShrink: 0 }}
              >{o.label}</button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((g) => (
            <GearCard key={g.id} item={g} onClick={() => onOpen && onOpen(g.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GearCard({ item: g, onClick }) {
  const Icon = window[window.GEAR_ICON[g.category]] || window.IconCarabiner;
  const tone = g.status === 'overdue' ? 'danger' : g.status === 'due_soon' ? 'warn' : g.status === 'current' ? 'ok' : 'chip';
  const days = g.days_to_inspection;
  const dayLabel = days == null ? 'Unscheduled'
    : days < 0 ? `${Math.abs(days)}d overdue`
    : days < 30 ? `${days}d to inspect`
    : `${Math.round(days / 30)}mo to inspect`;
  return (
    <button type="button" onClick={onClick} className="rk-card rk-card--interactive" style={{ all: 'unset', cursor: 'pointer', display: 'block', borderRadius: 14, padding: 14, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--lineSoft)' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--surface2)', display: 'grid', placeItems: 'center',
          '--icon-fill': 'var(--accent)', color: 'var(--text)',
        }}>
          <Icon size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{g.name}</span>
            <window.Pill tone={tone}>{dayLabel}</window.Pill>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 4 }}>
            {g.manufacturer} {g.model} · {g.serial_number}
          </div>
          {/* Mini timeline */}
          {days != null ? (
            <div style={{ marginTop: 10, height: 4, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: days < 0 ? '100%' : `${Math.max(6, Math.min(100, 100 - (days / 180) * 100))}%`,
                background: `var(--${tone})`,
                transition: 'width 360ms ease',
              }} />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// Audit Export ------------------------------------------------------
function ExportScreen({ onBack }) {
  const [includeDrafts, setIncludeDrafts] = React.useState(false);
  const [range, setRange] = React.useState('all');
  const [format, setFormat] = React.useState('pdf');
  const entries = window.MOCK_ENTRIES.filter((e) => includeDrafts || e.status !== 'draft');
  const signedHours = entries.filter((e) => e.status === 'signed').reduce((a, b) => a + b.work_hours, 0);

  return (
    <div className="rk-screen">
      <window.TopBar
        title="Audit export"
        leading={<window.IconBtn icon={window.IconArrowLeft} label="Back" onClick={onBack} />}
      />
      <div className="rk-screen-inner">
        {/* Preview */}
        <div style={{ padding: '4px 20px 16px' }}>
          <div className="rk-card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
            {/* Embossed brand watermark — only on the audit cover, where it earns its place. */}
            <div style={{
              position: 'absolute', right: -28, bottom: -28,
              opacity: 0.06, color: 'var(--text)',
              transform: 'rotate(-8deg)', pointerEvents: 'none',
              '--icon-fill': 'currentColor',
            }}>
              <window.IconBrand size={220} />
            </div>
            <div style={{
              position: 'absolute', right: -30, top: -30, width: 120, height: 120,
              borderRadius: '50%', border: '1.5px solid var(--lineSoft)', opacity: 0.6,
            }} />
            <div style={{
              position: 'absolute', right: -10, top: -10, width: 80, height: 80,
              borderRadius: '50%', border: '1.5px solid var(--lineSoft)', opacity: 0.6,
            }} />
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
              Audit packet · v2
            </div>
            <h2 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em' }}>
              {entries.length} entries
            </h2>
            <div style={{ fontSize: 12, color: 'var(--textDim)' }}>
              {window.fmtHours(signedHours)} signed hrs · chain verifiable
            </div>
            <div style={{ height: 1, background: 'var(--lineSoft)', margin: '14px 0' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <window.Pill tone="ok" icon={window.IconVerified}>Chain valid</window.Pill>
              <window.Pill tone="chip" icon={window.IconLock}>Hash v2</window.Pill>
              <window.Pill tone="chip" icon={window.IconChain}>{entries.length} links</window.Pill>
            </div>
          </div>
        </div>

        {/* Options */}
        <window.SectionH kicker="Options" title="What to include" />
        <div style={{ padding: '0 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <window.SectionH kicker="" title="Range" />
          <window.ChipSelect
            value={range}
            onChange={setRange}
            options={[
              { value: 'all', label: 'All time' },
              { value: 'year', label: 'This year' },
              { value: 'quarter', label: 'This quarter' },
              { value: 'custom', label: 'Custom…' },
            ]}
          />
          <ToggleRow label="Include drafts" sub="Unsigned entries marked as draft" value={includeDrafts} onChange={setIncludeDrafts} />
          <ToggleRow label="Include attachments" sub="Photos and supporting docs" value={true} onChange={() => {}} />
          <ToggleRow label="Embed chain proof" sub="Verifiable signature hashes" value={true} onChange={() => {}} disabled />
        </div>

        <window.SectionH kicker="Format" title="How to export" />
        <div style={{ padding: '0 20px 16px' }}>
          <div className="rk-grid3">
            {[
              { v: 'pdf', label: 'PDF', sub: 'Printable' },
              { v: 'json', label: 'JSON', sub: 'Audit packet' },
              { v: 'csv', label: 'CSV', sub: 'Spreadsheet' },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setFormat(o.v)}
                className="rk-card"
                style={{
                  padding: 12,
                  cursor: 'pointer',
                  all: 'unset',
                  background: format === o.v ? 'var(--accentSoft)' : 'var(--surface)',
                  boxShadow: format === o.v ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--lineSoft)',
                  borderRadius: 14,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: format === o.v ? 'var(--accent)' : 'var(--text)' }}>{o.label}</div>
                <div style={{ fontSize: 11, color: 'var(--textDim)' }}>{o.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 20px 24px' }}>
          <window.Button variant="primary" size="lg" full icon={window.IconExport}>
            Export {entries.length} entries
          </window.Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, sub, value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      className="rk-row"
      style={{ all: 'unset', cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--surface)', borderRadius: 14, boxShadow: 'inset 0 0 0 1px var(--lineSoft)', opacity: disabled ? 0.65 : 1 }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{
        width: 40, height: 24, borderRadius: 999,
        background: value ? 'var(--accent)' : 'var(--surface3)',
        position: 'relative',
        transition: 'background 200ms ease',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 18 : 2,
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--bg)',
          transition: 'left 200ms cubic-bezier(.2,.7,.3,1.4)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }} />
      </div>
    </button>
  );
}

// Profile / Settings ------------------------------------------------
function ProfileScreen({ onTheme, onExport, onSync }) {
  const p = window.MOCK_PROFILE;
  const { theme, themes } = window.useTheme();
  const currentTheme = themes[theme];
  return (
    <div className="rk-screen">
      <window.TopBar
        large
        title="Profile"
        subtitle="Your record · your certifications"
        leading={<window.IconBtn icon={window.IconProfile} label="Profile" />}
        trailing={<window.IconBtn icon={window.IconSettings} label="Settings" />}
      />
      <div className="rk-screen-inner">
        {/* Tech card */}
        <div style={{ padding: '4px 20px 16px' }}>
          <div className="rk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 58, height: 58, borderRadius: 18,
                background: 'var(--accent)', color: 'var(--accentInk)',
                display: 'grid', placeItems: 'center',
                fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
              }}>
                {p.full_name.split(' ').map((x) => x[0]).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{p.full_name}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>{p.employer}</div>
              </div>
              <window.Pill tone="accent" icon={window.IconCheck}>Active</window.Pill>
            </div>
            <div style={{ height: 1, background: 'var(--lineSoft)' }} />
            <div className="rk-grid2" style={{ gap: 12 }}>
              <CertCard scheme="SPRAT" id={p.sprat_id} level={p.sprat_level} expires={p.sprat_expires_on} />
              <CertCard scheme="IRATA" id={p.irata_id} level={p.irata_level} expires={p.irata_expires_on} warn />
            </div>
          </div>
        </div>

        <window.SectionH kicker="Theme" title="Appearance" />
        <div style={{ padding: '0 20px 14px' }}>
          <div className="rk-themepick">
            {window.THEME_ORDER.map((tk) => {
              const t = themes[tk];
              const active = tk === theme;
              return (
                <button
                  key={tk}
                  type="button"
                  className={'rk-themepick__btn' + (active ? ' rk-themepick__btn--active' : '')}
                  onClick={() => onTheme(tk)}
                >
                  <div className="rk-themepick__sw">
                    {t.swatch.map((c, i) => <div key={i} style={{ background: c }} />)}
                  </div>
                  <div>
                    <div className="rk-themepick__name">{t.name}{active ? ' ·' : ''}</div>
                    <div className="rk-themepick__sub">{t.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <window.SectionH kicker="Records" title="Manage" />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SettingsRow icon={window.IconExport} title="Audit export" sub="PDF · JSON · CSV" onClick={onExport} />
          <SettingsRow icon={window.IconSync} title="Sync & backup" sub="Last synced 4m ago" onClick={onSync} />
          <SettingsRow icon={window.IconChain} title="Chain integrity" sub="287/287 valid" />
          <SettingsRow icon={window.IconLock} title="Security" sub="Passcode · biometrics" />
        </div>

        <window.SectionH kicker="Help" title="Support" />
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SettingsRow icon={window.IconBell} title="Notifications" sub="Inspection alerts · daily summary" />
          <SettingsRow icon={window.IconCamera} title="Attachments" sub="Photo storage · 14 used" />
        </div>

        {/* Quiet brand footer — version + chain head, signed off with the mark */}
        <div style={{
          padding: '8px 20px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          color: 'var(--textFaint)',
          '--icon-fill': 'var(--textFaint)',
        }}>
          <window.IconBrand size={18} />
          <span className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            RALB · v1.0 · chain {window.MOCK_SUMMARY.chain_head.slice(0, 8)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CertCard({ scheme, id, level, expires, warn }) {
  const days = expires ? Math.round((new Date(expires) - new Date('2026-05-17')) / 86400000) : null;
  const isWarn = warn || (days != null && days < 120);
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: 'var(--surface2)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>{scheme}</span>
        {level ? <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>Level {level}</span> : null}
      </div>
      <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{id}</div>
      <div style={{ fontSize: 11, color: isWarn ? 'var(--warn)' : 'var(--textDim)' }}>
        {days != null ? (days > 0 ? `Expires in ${days}d` : 'EXPIRED') : 'No expiry on file'}
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, title, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rk-row" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--surface)', borderRadius: 14, boxShadow: 'inset 0 0 0 1px var(--lineSoft)' }}>
      <div className="rk-row__icon"><Icon size={20} /></div>
      <div className="rk-row__body">
        <div className="rk-row__title">{title}</div>
        <div className="rk-row__sub">{sub}</div>
      </div>
      <window.IconChevron size={16} />
    </button>
  );
}

Object.assign(window, { GearScreen, GearCard, GearDetail, ExportScreen, ToggleRow, ProfileScreen, CertCard, SettingsRow });

function GearDetail({ gearId, onBack }) {
  const g = window.MOCK_GEAR.find((x) => x.id === gearId) || window.MOCK_GEAR[0];
  const Icon = window[window.GEAR_ICON[g.category]] || window.IconCarabiner;
  const tone = g.status === 'overdue' ? 'danger' : g.status === 'due_soon' ? 'warn' : g.status === 'current' ? 'ok' : 'chip';
  const days = g.days_to_inspection;
  // Mock inspection history
  const history = React.useMemo(() => {
    const items = [];
    let d = g.last_inspected ? new Date(g.last_inspected) : new Date();
    for (let i = 0; i < 4; i++) {
      items.push({
        date: new Date(d).toISOString(),
        result: i === 0 ? 'pass_with_concerns' : 'pass',
        by: i % 2 === 0 ? 'M. Kerr · SPRAT-44190' : 'D. Sato · IRATA/IT-31-22118',
      });
      d.setMonth(d.getMonth() - 6);
    }
    return items;
  }, [gearId]);

  // Mock entries this item was used on
  const usedOn = window.MOCK_ENTRIES.filter((e) => (e.gear || []).includes(g.id)).slice(0, 3);
  const usedOnFallback = usedOn.length ? usedOn : window.MOCK_ENTRIES.slice(0, 3);

  return (
    <div className="rk-screen">
      <window.TopBar
        title={g.category[0].toUpperCase() + g.category.slice(1)}
        leading={<window.IconBtn icon={window.IconArrowLeft} label="Back" onClick={onBack} />}
        trailing={
          <>
            <window.IconBtn icon={window.IconCamera} label="Photo" />
            <window.IconBtn icon={window.IconMore} label="More" />
          </>
        }
      />
      <div className="rk-screen-inner">
        {/* Hero card */}
        <div style={{ padding: '4px 20px 16px' }}>
          <div className="rk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'var(--surface2)', display: 'grid', placeItems: 'center',
                color: 'var(--text)', '--icon-fill': 'var(--accent)',
              }}>
                <Icon size={36} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
                  {g.manufacturer} {g.model}
                </div>
                <h2 style={{ margin: '4px 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {g.name}
                </h2>
                <div className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>
                  S/N {g.serial_number}
                </div>
              </div>
              <window.Pill tone={tone} size="md">
                {g.status === 'overdue' ? 'Overdue' : g.status === 'due_soon' ? 'Due soon' : g.status === 'current' ? 'Current' : g.status === 'retired' ? 'Retired' : 'Unscheduled'}
              </window.Pill>
            </div>

            {/* Inspection countdown */}
            {days != null ? (
              <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: 14, alignItems: 'center', paddingTop: 4 }}>
                <CountdownDial days={days} tone={tone} />
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
                    Next inspection
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>
                    {window.fmtDate(g.next_inspection_due)}
                  </div>
                  <div style={{ fontSize: 12, color: `var(--${tone})`, marginTop: 4 }}>
                    {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                padding: 12, borderRadius: 12, background: 'var(--chip)',
                color: 'var(--chipText)', fontSize: 12,
              }}>
                No inspection schedule on file. Record one to start the cycle.
              </div>
            )}
          </div>
        </div>

        {/* Primary actions */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
          <window.Button variant="primary" full icon={window.IconStamp}>Record inspection</window.Button>
          <window.IconBtn icon={window.IconLock} label="Retire" size="lg" />
        </div>

        {/* Inspection history */}
        <window.SectionH kicker="Audit trail" title="Inspection history" action={<span className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>{history.length} records</span>} />
        <div style={{ padding: '0 20px 16px' }}>
          <div className="rk-card" style={{ padding: 4 }}>
            {history.map((h, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 12px',
                borderBottom: i < history.length - 1 ? '1px solid var(--lineSoft)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: h.result === 'pass' ? 'var(--okSoft)' : h.result === 'fail' ? 'var(--dangerSoft)' : 'var(--warnSoft)',
                  color: h.result === 'pass' ? 'var(--ok)' : h.result === 'fail' ? 'var(--danger)' : 'var(--warn)',
                  '--icon-fill': 'currentColor',
                  display: 'grid', placeItems: 'center',
                }}>
                  {h.result === 'fail' ? <window.IconVoid size={16} /> : h.result === 'pass' ? <window.IconCheck size={16} /> : <window.IconWarn size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {h.result === 'pass' ? 'Pass' : h.result === 'fail' ? 'Fail · retired' : 'Pass with concerns'}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>
                    {window.fmtDate(h.date)} · {h.by}
                  </div>
                </div>
                <window.IconChevron size={14} />
              </div>
            ))}
          </div>
        </div>

        {/* Used on recent entries */}
        <window.SectionH kicker="Linked entries" title="Used on" action={<span className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>{usedOnFallback.length}</span>} />
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usedOnFallback.map((e) => (
            <window.EntryRow key={e.id} entry={e} onClick={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CountdownDial({ days, tone }) {
  // visualize how full the inspection cycle is. 180d cycle assumed.
  const pct = days < 0 ? 1 : Math.min(1, 1 - days / 180);
  const C = 2 * Math.PI * 28;
  return (
    <div style={{ width: 76, height: 76, position: 'relative' }}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r="28" fill="none" stroke="var(--lineSoft)" strokeWidth="6" />
        <circle
          cx="38" cy="38" r="28" fill="none"
          stroke={`var(--${tone})`} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          transform="rotate(-90 38 38)"
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        textAlign: 'center', lineHeight: 1,
      }}>
        <div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: `var(--${tone})` }}>
            {days < 0 ? Math.abs(days) : days}
          </div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--textFaint)', marginTop: 2 }}>
            {days < 0 ? 'days late' : 'd left'}
          </div>
        </div>
      </div>
    </div>
  );
}
