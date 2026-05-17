// Screens: Records list + Record detail

function RecordsScreen({ onOpenEntry, onNew }) {
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const entries = window.MOCK_ENTRIES.filter((e) => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (q && !(`${e.site} ${e.work_task} ${e.client}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  // Group entries by month
  const grouped = entries.reduce((acc, e) => {
    const key = new Date(e.date_from).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});
  const counts = { all: window.MOCK_ENTRIES.length, draft: 1, signed: 4, amended: 1 };

  return (
    <div className="rk-screen">
      <window.TopBar
        large
        title="Records"
        subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · sealed in the chain`}
        leading={<window.IconBtn icon={window.IconArrowLeft} label="Back" />}
        trailing={
          <>
            <window.IconBtn icon={window.IconExport} label="Export" />
            <window.IconBtn icon={window.IconFilter} label="Filter" />
          </>
        }
      />
      <div className="rk-screen-inner">
        <div style={{ padding: '0 20px 8px' }}>
          <window.Field
            label="Search"
            value={q}
            onChange={setQ}
            placeholder="Site, client, task…"
            suffix={<window.IconSearch size={16} />}
          />
        </div>
        <div style={{ padding: '6px 20px 12px' }}>
          <window.ChipSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all',     label: `All · ${counts.all}` },
              { value: 'draft',   label: `Drafts · ${counts.draft}` },
              { value: 'signed',  label: `Signed · ${counts.signed}` },
              { value: 'amended', label: `Amended · ${counts.amended}` },
            ]}
          />
        </div>

        {entries.length === 0 ? (
          <window.EmptyState
            icon={window.IconSearch}
            title={q ? `Nothing matches "${q}"` : 'No entries in this view'}
            sub={q ? 'Try clearing the search, or check another filter.' : 'Start your first entry from the + tab.'}
            action={
              q ? (
                <window.Button variant="outline" size="sm" onClick={() => { setQ(''); setFilter('all'); }}>
                  Clear filters
                </window.Button>
              ) : null
            }
          />
        ) : null}

        {Object.entries(grouped).map(([month, list]) => (
          <div key={month}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px 6px', position: 'sticky', top: 0,
              background: 'var(--bg)', zIndex: 2,
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--textFaint)' }}>
                {month}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--textDim)' }}>
                {list.length}
              </span>
            </div>
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((e) => (
                <window.EntryRow key={e.id} entry={e} onClick={() => onOpenEntry(e.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordDetail({ entryId, onBack, onSign }) {
  const e = window.MOCK_ENTRIES.find((x) => x.id === entryId) || window.MOCK_ENTRIES[0];
  const { fmtDate, fmtTime, fmtHours, StatusPill, HashGlyph } = window;
  const sig = e.signature;
  const isDraft = e.status === 'draft';

  return (
    <div className="rk-screen">
      <window.TopBar
        title={`Entry ${e.id.toUpperCase()}`}
        leading={<window.IconBtn icon={window.IconArrowLeft} label="Back" onClick={onBack} />}
        trailing={
          <>
            <window.IconBtn icon={window.IconExport} label="Export" />
            <window.IconBtn icon={window.IconMore} label="More" />
          </>
        }
      />
      <div className="rk-screen-inner">
        {/* Hero block */}
        <div style={{ padding: '4px 20px 16px' }}>
          <div className="rk-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
                  {fmtDate(e.date_from)}
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                  {e.site}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--textDim)', marginTop: 4 }}>
                  {e.client} · {e.work_task}
                </div>
              </div>
              <StatusPill status={e.status} size="md" />
            </div>

            <div style={{ height: 1, background: 'var(--lineSoft)', margin: '18px 0 14px' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <DetailStat label="Hours" value={fmtHours(e.work_hours)} suffix="h" />
              <DetailStat label="Height" value={e.max_height} suffix={e.height_unit} />
              <DetailStat label="Access" value={e.access_method.includes('double') ? '2-rope' : '1-rope'} />
            </div>
          </div>
        </div>

        {/* Task description */}
        <div style={{ padding: '0 20px 16px' }}>
          <window.SectionH kicker="What you did" title="Work description" />
          <div className="rk-card" style={{ padding: 16 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>
              {e.description}
            </p>
          </div>
        </div>

        {/* Gear used */}
        <div style={{ padding: '0 20px 16px' }}>
          <window.SectionH kicker="On rope" title="Gear used" action={<span className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>{e.gear?.length || 4} items</span>} />
          <div className="rk-card" style={{ padding: 8 }}>
            {(e.gear || ['g_har_avao', 'g_rope_iridium', 'g_desc_rig', 'g_helmet_vertex']).map((id, i, arr) => {
              const g = window.MOCK_GEAR.find((x) => x.id === id);
              if (!g) return null;
              const Icon = window[window.GEAR_ICON[g.category]] || window.IconCarabiner;
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--lineSoft)' : 'none',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'var(--surface2)', display: 'grid', placeItems: 'center',
                    '--icon-fill': 'var(--accent)', color: 'var(--text)',
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>{g.manufacturer} · {g.serial_number}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Signature / chain block */}
        <div style={{ padding: '0 20px 16px' }}>
          <window.SectionH kicker={sig ? 'Sealed in chain' : 'Unsigned'} title={sig ? 'Signature' : 'Awaiting signature'} />
          {sig ? (
            <div className="rk-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="rk-sigfill">
                <div className="rk-sigfill__line" />
                <div className="rk-sigfill__ink">{sig.supervisor_name}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{sig.supervisor_name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>{sig.supervisor_cert_number}</div>
                </div>
                <window.Pill tone="ok" icon={window.IconVerified} size="md">Verified</window.Pill>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 4 }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>Signed at</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{fmtDate(sig.signed_at)} · {fmtTime(sig.signed_at)}</div>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>Method</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{sig.method === 'local' ? 'Local · in person' : 'Remote · token'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rk-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--textDim)', marginBottom: 12 }}>
                Once signed, this entry hashes into the chain and becomes immutable. You can amend it later, but you can't edit it.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <window.Button variant="primary" full icon={window.IconSign} onClick={onSign}>Sign now</window.Button>
                <window.Button variant="outline" full icon={window.IconBolt}>Request remote</window.Button>
              </div>
            </div>
          )}
        </div>

        {/* Chain context */}
        {sig ? (
          <div style={{ padding: '0 20px 24px' }}>
            <window.SectionH kicker="Position in chain" title="Hash links" />
            <div className="rk-card" style={{ padding: 14 }}>
              <div className="rk-chain">
                <ChainLink hash={sig.chain_hash} label="This entry" date={e.date_from} bullet="accent" head />
                <ChainLink hash={sig.previous_chain_hash} label="Previous link" date="2026-05-14" />
                <ChainLink hash="7e5d3a9c" label="WTG-14 · Blade Repair" date="2026-05-12" dim />
                <ChainLink hash="12bc9a87" label="Skye 1 · Facade" date="2026-05-08" dim last />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailStat({ label, value, suffix }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
        <span className="num" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</span>
        {suffix ? <span style={{ fontSize: 12, color: 'var(--textDim)' }}>{suffix}</span> : null}
      </div>
    </div>
  );
}

function ChainLink({ hash, label, date, bullet, dim, head, last }) {
  return (
    <div className="rk-chain__link">
      {!last ? <div className="rk-chain__rail" /> : null}
      <div className={'rk-chain__bullet' + (dim ? ' rk-chain__bullet--dim' : '')} />
      <div className="rk-chain__main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="rk-chain__hash">{hash}</span>
          {head ? <window.Pill tone="accent" size="sm">HEAD</window.Pill> : null}
        </div>
        <div className="rk-chain__label">{label} · {window.fmtDateShort(date)}</div>
      </div>
      <window.HashGlyph hash={hash} />
    </div>
  );
}

Object.assign(window, { RecordsScreen, RecordDetail, DetailStat, ChainLink });
