// Screens: Today (home) + Onboarding + Splash

function Splash() {
  return (
    <div className="rk-splash">
      <div className="rk-splash__center">
        <div className="rk-splash__brand">
          <window.IconBrand size={80} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em' }}>RALB</div>
          <div className="ribbon mono" style={{ fontSize: 10, letterSpacing: '0.24em', color: 'var(--textDim)', textTransform: 'uppercase', marginTop: 4 }}>
            Rope Access Logbook
          </div>
        </div>
        <div className="rk-splash__bar" />
      </div>
    </div>
  );
}

function Onboarding({ onDone }) {
  const [step, setStep] = React.useState(0);
  const slides = [
    {
      icon: window.IconBrand,
      title: 'Your logbook,\nin your pocket.',
      sub: 'RALB is an offline-first rope access logbook for SPRAT and IRATA technicians. Log hours, capture signatures, prove your record.',
      cta: 'Continue',
    },
    {
      icon: window.IconChain,
      title: 'Tamper-evident\nby design.',
      sub: 'Every signed entry hashes into the chain. Auditors can verify your record without trusting us — they trust the chain.',
      cta: 'Continue',
    },
    {
      icon: window.IconOffline,
      title: 'Works off-rope,\nworks off-grid.',
      sub: 'Write entries from the truck, the tower top, or the trailer. Records flush automatically when you reconnect.',
      cta: 'Get started',
    },
  ];
  const s = slides[step];
  const Icon = s.icon;
  return (
    <div className="rk-screen">
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '70px 24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--textFaint)' }}>
            {String(step + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
          </div>
          <button
            type="button"
            onClick={onDone}
            style={{ background: 'transparent', border: 'none', color: 'var(--textDim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Skip</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
          <div className="rk-hero-mark" style={{ animation: 'rk-pop 600ms cubic-bezier(.2,.7,.3,1.4)' }} key={step}>
            <Icon size={48} />
          </div>
          <div style={{ animation: 'rk-rise 480ms 80ms both ease-out' }} key={'t' + step}>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, margin: 0, whiteSpace: 'pre-line' }}>
              {s.title}
            </h1>
            <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.5, color: 'var(--textDim)' }}>{s.sub}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 6, height: 6, borderRadius: 999,
              background: i === step ? 'var(--accent)' : 'var(--surface3)',
              transition: 'all 280ms ease',
            }} />
          ))}
        </div>
        <window.Button
          variant="primary" size="lg" full
          iconRight={window.IconChevron}
          onClick={() => (step < slides.length - 1 ? setStep(step + 1) : onDone())}
        >{s.cta}</window.Button>
      </div>
    </div>
  );
}

function TodayScreen({ summary, profile, lastSigned, onOpenEntry, onSync, onTheme }) {
  const { fmtHours, AnimatedNumber, HashGlyph, SectionH, Card, SyncChip, IconBtn, Pill, TopBar, PullToRefresh } = window;
  return (
    <PullToRefresh onRefresh={() => new Promise((r) => setTimeout(r, 1100))}>
      <TopBar
        large
        title={`Good evening,\n${profile.full_name.split(' ')[0]}.`}
        subtitle={`${fmtHours(summary.hours_week)}h this week · ${summary.entries_career} career entries`}
        leading={<IconBtn icon={window.IconBrand} label="RALB" />}
        trailing={
          <>
            <SyncChip state={summary.sync_state} count={summary.queued_count} onPress={onSync} />
            <IconBtn icon={window.IconBell} label="Alerts" />
          </>
        }
      />
      <div className="rk-screen-inner">
        {/* Hero: Career hours, live counter */}
        <div style={{ padding: '6px 20px 12px' }}>
          <div className="rk-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
                Career hours
              </div>
              <Pill tone="accent" icon={window.IconBolt}>Live</Pill>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <AnimatedNumber
                value={summary.hours_career}
                className="num"
                style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}
                fmt={(v) => Math.round(v).toLocaleString()}
              />
              <span style={{ color: 'var(--textDim)', fontWeight: 600, fontSize: 14 }}>hrs</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, paddingTop: 4 }}>
              <div>
                <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{fmtHours(summary.hours_week)}</div>
                <div style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 2 }}>This week</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{fmtHours(summary.hours_month)}</div>
                <div style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 2 }}>This month</div>
              </div>
              <div>
                <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{summary.entries_career}</div>
                <div style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 2 }}>Entries</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chain head */}
        <div style={{ padding: '4px 20px 12px' }}>
          <button
            type="button"
            onClick={() => onOpenEntry && onOpenEntry(lastSigned.id)}
            style={{
              all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
            }}
          >
            <div className="rk-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accentSoft)', display: 'grid', placeItems: 'center', '--icon-fill': 'var(--accent)', color: 'var(--accent)' }}>
                <window.IconChain size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>Chain head</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {summary.chain_head.slice(0, 8)}…{summary.chain_head.slice(-4)}
                  </span>
                  <HashGlyph hash={summary.chain_head} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--textDim)', marginTop: 4 }}>
                  Last sealed · {window.fmtDate(lastSigned.signature.signed_at)} · {lastSigned.site}
                </div>
              </div>
              <window.IconChevron size={18} />
            </div>
          </button>
        </div>

        {/* Quick log — one-tap continuation of last shift */}
        <window.SectionH
          kicker="Pick up where you left off"
          title="Quick log"
          action={<button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--textDim)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Templates →</button>}
        />
        <div style={{ padding: '0 20px 12px' }}>
          <QuickLogCard lastEntry={lastSigned} onContinue={() => {}} />
        </div>

        {/* Action stats */}
        <SectionH kicker="Needs attention" title="On your plate" />
        <div style={{ padding: '0 20px' }}>
          <div className="rk-grid2">
            <ActionTile
              icon={window.IconDraft}
              value={summary.drafts_pending}
              label="Open drafts"
              hint="Tap to resume"
              tone="warn"
            />
            <ActionTile
              icon={window.IconPending}
              value={summary.awaiting_signature}
              label="Awaiting signature"
              hint="From M. Kerr"
              tone="accent"
            />
            <ActionTile
              icon={window.IconWarn}
              value={summary.gear_overdue}
              label="Gear overdue"
              hint="BASIC ascender"
              tone="danger"
            />
            <ActionTile
              icon={window.IconClock}
              value={summary.gear_due_soon}
              label="Gear due soon"
              hint="≤14 days"
              tone="warn"
            />
          </div>
        </div>

        {/* Recent activity */}
        <SectionH kicker="Recent" title="Last 5 entries" action={<button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--textDim)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>All →</button>} />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {window.MOCK_ENTRIES.slice(0, 5).map((e) => (
            <EntryRow key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />
          ))}
        </div>
      </div>
    </PullToRefresh>
  );
}

function ActionTile({ icon: Icon, value, label, hint, tone }) {
  return (
    <div className="rk-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          display: 'grid', placeItems: 'center',
          background: `var(--${tone}Soft)`,
          color: `var(--${tone})`,
          '--icon-fill': `var(--${tone})`,
        }}>
          <Icon size={18} />
        </div>
        <div className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1 }}>{value}</div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 2 }}>{hint}</div>
      </div>
    </div>
  );
}

function EntryRow({ entry, onClick }) {
  const { fmtHours, fmtDateShort, StatusPill, HashGlyph } = window;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rk-card rk-card--interactive"
      style={{
        all: 'unset', cursor: 'pointer', display: 'flex',
        padding: 14, background: 'var(--surface)', borderRadius: 14,
        boxShadow: 'inset 0 0 0 1px var(--lineSoft)',
        gap: 12, alignItems: 'center',
      }}
    >
      <div style={{
        width: 44, textAlign: 'center', flexShrink: 0,
        fontFamily: 'var(--mono)', color: 'var(--textDim)',
      }}>
        <div className="num" style={{ fontSize: 18, color: 'var(--text)', fontWeight: 600 }}>
          {new Date(entry.date_from).getDate()}
        </div>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
          {new Date(entry.date_from).toLocaleDateString('en-US', { month: 'short' })}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {entry.site}
        </div>
        <div style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{entry.work_task}</span>
          <span style={{ width: 2, height: 2, borderRadius: 99, background: 'var(--textFaint)' }} />
          <span className="num">{fmtHours(entry.work_hours)}h</span>
          {entry.signature ? (
            <>
              <span style={{ width: 2, height: 2, borderRadius: 99, background: 'var(--textFaint)' }} />
              <HashGlyph hash={entry.signature.chain_hash} size={12} />
            </>
          ) : null}
        </div>
      </div>
      <StatusPill status={entry.status} />
    </button>
  );
}

Object.assign(window, { Splash, Onboarding, TodayScreen, EntryRow, ActionTile, QuickLogCard });

function QuickLogCard({ lastEntry, onContinue }) {
  return (
    <button
      type="button"
      onClick={onContinue}
      className="rk-card rk-card--interactive"
      style={{
        all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
        padding: 16, background: 'var(--surface)', borderRadius: 18,
        boxShadow: 'inset 0 0 0 1px var(--lineSoft)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Soft accent gleam in the corner */}
      <div style={{
        position: 'absolute', right: -28, top: -28, width: 120, height: 120,
        background: 'radial-gradient(circle, var(--accentSoft) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--accent)', color: 'var(--accentInk)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
          '--icon-fill': 'currentColor',
        }}>
          <window.IconBolt size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
            Continue today's shift
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2 }}>
            Duplicate {lastEntry.site}
          </div>
          <div style={{ fontSize: 11, color: 'var(--textDim)', marginTop: 2 }}>
            {lastEntry.work_task} · {window.fmtHours(lastEntry.work_hours)}h template
          </div>
        </div>
        <window.IconChevron size={18} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap', position: 'relative' }}>
        <QuickChip icon={window.IconStamp} label="Same as last" />
        <QuickChip icon={window.IconSign} label="Request signature" />
        <QuickChip icon={window.IconCamera} label="Photo log" />
      </div>
    </button>
  );
}

function QuickChip({ icon: Icon, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 10px 5px 7px',
      borderRadius: 999,
      background: 'var(--surface2)',
      color: 'var(--text)',
      fontSize: 11, fontWeight: 600,
      '--icon-fill': 'var(--accent)',
    }}>
      <Icon size={13} />
      {label}
    </span>
  );
}
