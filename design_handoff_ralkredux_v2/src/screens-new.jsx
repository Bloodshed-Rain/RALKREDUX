// New entry (3-step) + Sign flow

function NewEntryFlow({ open, onClose, onComplete }) {
  const [step, setStep] = React.useState(0);
  const [draft, setDraft] = React.useState({
    site: 'BP Whiting · Tank 47B',
    client: 'BP Refining',
    employer: 'Vertical North Industrial',
    work_task: 'NDT Inspection',
    access_method: 'Rope access · single rope',
    structure_type: 'Storage tank',
    description: '',
    work_hours: 7.5,
    max_height: 38,
    height_unit: 'm',
    date_from: new Date().toISOString().slice(0, 10),
    gear: ['g_har_avao', 'g_rope_iridium', 'g_desc_rig', 'g_helmet_vertex'],
  });

  React.useEffect(() => { if (open) setStep(0); }, [open]);

  const steps = ['Where', 'What', 'Review'];

  return (
    <window.Sheet open={open} onClose={onClose} height="92%">
      {/* Custom head */}
      <div style={{ padding: '0 20px 8px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: -4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <window.IconBtn icon={window.IconClose} label="Close" onClick={onClose} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--textFaint)', letterSpacing: '0.12em' }}>
              {String(step + 1).padStart(2, '0')} / 03
            </span>
          </div>
          <window.Button
            variant="ghost" size="sm"
            onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete(draft)}
          >{step === steps.length - 1 ? 'Save draft' : 'Next'}</window.Button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6 }}>
          {steps.map((label, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }} onClick={() => setStep(i)}>
              <div style={{
                height: 3, borderRadius: 999,
                background: i <= step ? 'var(--accent)' : 'var(--surface3)',
                transition: 'background 240ms ease',
              }} />
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                color: i === step ? 'var(--text)' : 'var(--textFaint)',
              }}>{label}</div>
            </div>
          ))}
        </div>

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {['Where were you?', 'What did you do?', 'Review & save'][step]}
        </h1>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px 24px' }}>
        {step === 0 ? <StepWhere draft={draft} setDraft={setDraft} /> : null}
        {step === 1 ? <StepWhat draft={draft} setDraft={setDraft} /> : null}
        {step === 2 ? <StepReview draft={draft} /> : null}
      </div>

      <div style={{ padding: '8px 20px 20px', borderTop: '1px solid var(--lineSoft)', display: 'flex', gap: 10 }}>
        <window.Button
          variant="ghost" size="lg"
          onClick={() => step > 0 ? setStep(step - 1) : onClose()}
          icon={window.IconArrowLeft}
        >Back</window.Button>
        <window.Button
          variant="primary" size="lg" full
          iconRight={step === steps.length - 1 ? window.IconCheck : window.IconChevron}
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : onComplete(draft)}
        >
          {step === steps.length - 1 ? 'Save & sign' : 'Continue'}
        </window.Button>
      </div>
    </window.Sheet>
  );
}

function StepWhere({ draft, setDraft }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
      <window.SectionH kicker="Recent sites" title="Reuse" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {window.SITE_RECENTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setDraft({ ...draft, site: s })}
            className={'rk-chipsel__item ' + (s === draft.site ? 'rk-chipsel__item--active' : '')}
            style={{ borderRadius: 999 }}
          >{s}</button>
        ))}
      </div>

      <window.Field
        label="Site"
        value={draft.site}
        onChange={(v) => setDraft({ ...draft, site: v })}
        placeholder="e.g. BP Whiting · Tank 47B"
      />
      <window.Field
        label="Client"
        value={draft.client}
        onChange={(v) => setDraft({ ...draft, client: v })}
        placeholder="Client name"
      />
      <window.Field
        label="Employer"
        value={draft.employer}
        onChange={(v) => setDraft({ ...draft, employer: v })}
      />

      <window.SectionH kicker="Date" title="When" />
      <div style={{ display: 'flex', gap: 10 }}>
        <window.Field
          label="Date"
          value={window.fmtDate(draft.date_from)}
          readOnly
          suffix={<window.IconCalendar size={16} />}
        />
      </div>
    </div>
  );
}

function StepWhat({ draft, setDraft }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
      <window.SectionH kicker="Task" title="What was the work?" />
      <window.ChipSelect
        value={draft.work_task}
        onChange={(v) => setDraft({ ...draft, work_task: v })}
        options={window.TASK_CATALOG}
      />

      <window.SectionH kicker="Structure" title="Where was the work?" />
      <window.ChipSelect
        value={draft.structure_type}
        onChange={(v) => setDraft({ ...draft, structure_type: v })}
        options={window.STRUCTURE_CATALOG}
      />

      <window.SectionH kicker="Access" title="How did you get on it?" />
      <window.ChipSelect
        value={draft.access_method}
        onChange={(v) => setDraft({ ...draft, access_method: v })}
        options={window.ACCESS_CATALOG}
      />

      <div className="rk-grid2" style={{ marginTop: 4 }}>
        <window.Field
          label="Hours"
          value={String(draft.work_hours)}
          onChange={(v) => setDraft({ ...draft, work_hours: Number(v) || 0 })}
          suffix="hrs"
          type="number"
        />
        <window.Field
          label="Max height"
          value={String(draft.max_height)}
          onChange={(v) => setDraft({ ...draft, max_height: Number(v) || 0 })}
          suffix={draft.height_unit}
          type="number"
        />
      </div>

      <window.Field
        label="Description"
        value={draft.description}
        onChange={(v) => setDraft({ ...draft, description: v })}
        placeholder="What did you actually do? Be specific — auditors read this."
        multiline
      />

      <window.SectionH kicker="Gear" title={`On rope · ${draft.gear.length} items`} action={<window.IconBtn icon={window.IconPlus} label="Add" size="sm" />} />
      <div className="rk-grid4" style={{ gap: 8 }}>
        {draft.gear.map((id) => {
          const g = window.MOCK_GEAR.find((x) => x.id === id);
          if (!g) return null;
          const Icon = window[window.GEAR_ICON[g.category]] || window.IconCarabiner;
          return (
            <div key={id} style={{
              aspectRatio: '1',
              borderRadius: 12, background: 'var(--surface)',
              boxShadow: 'inset 0 0 0 1px var(--lineSoft)',
              display: 'grid', placeItems: 'center',
              '--icon-fill': 'var(--accent)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Icon size={22} />
                <div className="mono" style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--textDim)', textTransform: 'uppercase' }}>{g.category}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Photo evidence strip */}
      <window.SectionH kicker="Evidence" title="Photos" action={<span className="mono" style={{ fontSize: 11, color: 'var(--textDim)' }}>0 of 6</span>} />
      <PhotoStrip />
    </div>
  );
}

function PhotoStrip() {
  const [photos, setPhotos] = React.useState([]);
  return (
    <div style={{ display: 'flex', gap: 8, overflow: 'auto', paddingBottom: 4 }}>
      <button
        type="button"
        onClick={() => setPhotos([...photos, photos.length])}
        style={{
          flexShrink: 0, width: 88, height: 88, borderRadius: 14,
          background: 'var(--accentSoft)', color: 'var(--accent)',
          border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          '--icon-fill': 'currentColor',
        }}
      >
        <window.IconCamera size={22} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>Capture</span>
      </button>
      {photos.length === 0 ? (
        <>
          <PhotoSlot label="Anchors" />
          <PhotoSlot label="Workzone" />
          <PhotoSlot label="Hazard" />
        </>
      ) : (
        photos.map((p) => (
          <div key={p} style={{
            flexShrink: 0, width: 88, height: 88, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--surface2), var(--surface3))',
            position: 'relative',
            display: 'grid', placeItems: 'center',
            color: 'var(--textFaint)',
            '--icon-fill': 'currentColor',
          }}>
            <window.IconCamera size={20} />
            <div className="mono" style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 9, color: 'var(--text)', letterSpacing: '0.1em' }}>
              IMG_{String(p + 1).padStart(3, '0')}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PhotoSlot({ label }) {
  return (
    <div style={{
      flexShrink: 0, width: 88, height: 88, borderRadius: 14,
      background: 'transparent',
      boxShadow: 'inset 0 0 0 1.5px var(--lineSoft)',
      display: 'flex', alignItems: 'flex-end', padding: 8,
    }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function StepReview({ draft }) {
  const { fmtHours, fmtDate } = window;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
      <div className="rk-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--textFaint)', textTransform: 'uppercase' }}>{fmtDate(draft.date_from)}</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{draft.site}</h2>
            <div style={{ fontSize: 12, color: 'var(--textDim)', marginTop: 4 }}>{draft.client} · {draft.work_task}</div>
          </div>
          <window.StatusPill status="draft" />
        </div>
        <div style={{ height: 1, background: 'var(--lineSoft)', margin: '14px 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <window.DetailStat label="Hours" value={fmtHours(draft.work_hours)} suffix="h" />
          <window.DetailStat label="Height" value={draft.max_height} suffix={draft.height_unit} />
          <window.DetailStat label="Gear" value={draft.gear.length} suffix="items" />
        </div>
      </div>

      <window.SectionH kicker="Ready to seal" title="Sign now or later?" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ChoiceRow
          icon={window.IconSign}
          title="Sign in person"
          sub="Hand it to your supervisor for a wet signature"
        />
        <ChoiceRow
          icon={window.IconBolt}
          title="Request remote signature"
          sub="Send a verifier link to your supervisor"
        />
        <ChoiceRow
          icon={window.IconDraft}
          title="Save as draft"
          sub="Finish the entry later, signature when ready"
          dim
        />
      </div>

      <div style={{
        padding: 12, borderRadius: 12,
        background: 'var(--warnSoft)', color: 'var(--warn)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <window.IconWarn size={16} />
        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
          Once signed, this entry is sealed in the chain. You can amend it, but you can't edit it.
        </div>
      </div>
    </div>
  );
}

function ChoiceRow({ icon: Icon, title, sub, dim }) {
  return (
    <div className="rk-row" style={{ opacity: dim ? 0.85 : 1 }}>
      <div className="rk-row__icon"><Icon size={20} /></div>
      <div className="rk-row__body">
        <div className="rk-row__title">{title}</div>
        <div className="rk-row__sub">{sub}</div>
      </div>
      <window.IconChevron size={16} />
    </div>
  );
}

// Sign flow ----------------------------------------------------------
function SignScreen({ entryId, onBack, onSigned }) {
  const e = window.MOCK_ENTRIES.find((x) => x.id === entryId) || window.MOCK_ENTRIES[0];
  const [supName, setSupName] = React.useState('Marisol Kerr');
  const [supCert, setSupCert] = React.useState('SPRAT-44190');
  const [scheme, setScheme] = React.useState('sprat');
  const [attest, setAttest] = React.useState(false);
  const [pathPts, setPathPts] = React.useState([]);
  const [stage, setStage] = React.useState('form'); // 'form' | 'sealing' | 'sealed'

  const canSeal = supName && (scheme === 'sprat' || supCert) && attest && pathPts.length > 3;

  const seal = () => {
    setStage('sealing');
    setTimeout(() => setStage('sealed'), 1700);
    setTimeout(() => onSigned && onSigned(), 3000);
  };

  if (stage === 'sealing' || stage === 'sealed') {
    return (
      <div className="rk-screen" style={{ display: 'flex', flexDirection: 'column' }}>
        <window.TopBar
          title="Sealing chain"
          leading={<window.IconBtn icon={window.IconArrowLeft} label="Back" />}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 28 }}>
          <SealAnim sealed={stage === 'sealed'} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {stage === 'sealed' ? 'Sealed in chain' : 'Sealing…'}
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--textDim)', marginTop: 8, letterSpacing: '0.04em' }}>
              {stage === 'sealed' ? '3f9a1c54a7b1d220' : 'Hashing entry · v2'}
            </div>
          </div>
          {stage === 'sealed' ? (
            <div style={{ width: '100%', maxWidth: 280 }}>
              <window.Button variant="primary" size="lg" full icon={window.IconCheck} onClick={onSigned}>
                View signed entry
              </window.Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rk-screen">
      <window.TopBar
        title="Sign entry"
        leading={<window.IconBtn icon={window.IconArrowLeft} label="Back" onClick={onBack} />}
        trailing={<window.IconBtn icon={window.IconMore} label="More" />}
      />
      <div className="rk-screen-inner">
        {/* Mini context card */}
        <div style={{ padding: '4px 20px 16px' }}>
          <div className="rk-row">
            <div className="rk-row__icon"><window.IconLock size={18} /></div>
            <div className="rk-row__body">
              <div className="rk-row__title">{e.site}</div>
              <div className="rk-row__sub">{window.fmtDate(e.date_from)} · {window.fmtHours(e.work_hours)} hrs · {e.work_task}</div>
            </div>
            <window.StatusPill status="draft" />
          </div>
        </div>

        {/* Supervisor */}
        <div style={{ padding: '0 20px 16px' }}>
          <window.SectionH kicker="Supervisor" title="Who is signing?" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <window.ChipSelect
              value={scheme}
              onChange={setScheme}
              options={[{ value: 'sprat', label: 'SPRAT' }, { value: 'irata', label: 'IRATA' }]}
            />
            <window.Field label="Full name" value={supName} onChange={setSupName} placeholder="As on cert" />
            <window.Field
              label={scheme === 'irata' ? 'IRATA #' : 'SPRAT #'}
              value={supCert}
              onChange={setSupCert}
              placeholder={scheme === 'irata' ? 'Required' : 'Optional'}
              helper={scheme === 'irata' ? 'Required for IRATA.' : 'Optional for SPRAT.'}
            />
          </div>
        </div>

        {/* Signature pad */}
        <div style={{ padding: '0 20px 16px' }}>
          <window.SectionH kicker="Signature" title="Sign below" action={<button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--textDim)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => setPathPts([])}>Clear</button>} />
          <SigPad value={pathPts} onChange={setPathPts} />
        </div>

        {/* Attestation */}
        <div style={{ padding: '0 20px 16px' }}>
          <label className="rk-card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: attest ? 'var(--accent)' : 'transparent',
              boxShadow: 'inset 0 0 0 1.5px ' + (attest ? 'var(--accent)' : 'var(--line)'),
              display: 'grid', placeItems: 'center',
              color: 'var(--accentInk)',
              flexShrink: 0, marginTop: 1,
            }}>
              {attest ? <window.IconCheck size={14} /> : null}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Attestation</div>
              <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.45, color: 'var(--textDim)' }}>
                I confirm I directly supervised the work above, the technician was competent for the task, and the record is accurate to my knowledge.
              </p>
            </div>
            <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} style={{ position: 'absolute', opacity: 0 }} />
          </label>
        </div>

        <div style={{ padding: '0 20px 24px' }}>
          <window.Button
            variant="primary" size="lg" full
            icon={window.IconStamp}
            disabled={!canSeal}
            onClick={seal}
          >Seal in chain</window.Button>
        </div>
      </div>
    </div>
  );
}

// Tiny signature pad ------------------------------------------------
function SigPad({ value, onChange }) {
  const ref = React.useRef(null);
  const drawingRef = React.useRef(false);
  const onDown = (e) => {
    drawingRef.current = true;
    const r = ref.current.getBoundingClientRect();
    const p = pt(e, r);
    onChange([...value, [{ x: p.x, y: p.y }]]);
  };
  const onMove = (e) => {
    if (!drawingRef.current) return;
    const r = ref.current.getBoundingClientRect();
    const p = pt(e, r);
    const copy = value.slice();
    copy[copy.length - 1] = [...copy[copy.length - 1], { x: p.x, y: p.y }];
    onChange(copy);
  };
  const onUp = () => { drawingRef.current = false; };
  return (
    <div
      ref={ref}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      style={{
        height: 180, borderRadius: 14, background: 'var(--surface)',
        boxShadow: 'inset 0 0 0 1.5px var(--lineSoft)',
        position: 'relative', overflow: 'hidden', cursor: 'crosshair',
        touchAction: 'none',
      }}
    >
      {/* Baseline */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 32, height: 1, background: 'var(--lineSoft)' }} />
      <div style={{ position: 'absolute', left: 16, bottom: 12, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--textFaint)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        ✕ Sign here
      </div>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {value.map((stroke, i) => (
          <polyline
            key={i}
            points={stroke.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
function pt(e, r) {
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}

// Seal animation -----------------------------------------------------
function SealAnim({ sealed }) {
  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <svg viewBox="0 0 200 200" width="200" height="200">
        {/* outer ring */}
        <circle cx="100" cy="100" r="84" fill="none" stroke="var(--line)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="84" fill="none" stroke="var(--accent)" strokeWidth="2"
          strokeDasharray="528" strokeDashoffset={sealed ? 0 : 528}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.65,.05,.36,1)' }}
          transform="rotate(-90 100 100)"
        />
        {/* mid ring */}
        <circle cx="100" cy="100" r="64" fill="none" stroke="var(--lineSoft)" strokeWidth="1" />
        {/* tick marks */}
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1="100" y1="22" x2="100" y2="30"
            transform={`rotate(${i * 15} 100 100)`}
            stroke="var(--textFaint)" strokeWidth="1"
          />
        ))}
        {/* center stamp box */}
        <rect x="56" y="64" width="88" height="72" rx="6"
          fill={sealed ? 'var(--accent)' : 'transparent'}
          stroke="var(--accent)" strokeWidth="2"
          style={{ transition: 'fill 360ms ease' }}
        />
      </svg>
      {/* center icon — the mark brands the seal moment */}
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        color: sealed ? 'var(--accentInk)' : 'var(--accent)',
        '--icon-fill': 'currentColor',
        transition: 'color 360ms ease',
        animation: sealed ? 'rk-pop 500ms cubic-bezier(.2,.7,.3,1.4)' : 'none',
      }}>
        {sealed ? <window.IconBrand size={44} /> : <window.IconVerified size={36} />}
      </div>
    </div>
  );
}

Object.assign(window, { NewEntryFlow, SignScreen, ChoiceRow, SealAnim, SigPad, PhotoStrip, PhotoSlot });
