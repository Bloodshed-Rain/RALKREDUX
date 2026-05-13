/* app.jsx — root entry. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "directionFocus": "b",
  "palette": "tidewater"
}/*EDITMODE-END*/;

const PALETTE_OPTIONS = [
  { value: 'orange',   label: 'Signal Orange', sw: ['#0b2545','#f6f3eb','#e85a1f'] },
  { value: 'hiviz',    label: 'High-Vis',      sw: ['#0e0e0e','#ecece6','#ffd400'] },
  { value: 'refinery', label: 'Refinery',      sw: ['#0c3e44','#f0ead8','#e85a1f'] },
  { value: 'nightops', label: 'Night Ops',     sw: ['#1a1a18','#f0e4c8','#ffb020'] },
  { value: 'arctic',   label: 'Arctic',        sw: ['#0b2545','#eef3f7','#00a3c4'] },
  { value: 'heritage', label: 'Heritage',      sw: ['#1f3b2c','#ebe3d2','#a83a25'] },
  { value: 'drydock',  label: 'Drydock',       sw: ['#0a3554','#ece4cf','#c63d1f'] },
  { value: 'tidewater',label: 'Tidewater',     sw: ['#0e3a40','#e6ece8','#5cb3c4'] },
  { value: 'glacier',  label: 'Glacier',       sw: ['#13203a','#eef1f3','#4ad6a4'] },
];

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply palette before render so C/C2 are mutated for this pass.
  applyPalette(tweaks.palette || 'orange');

  const hideOther = tweaks.directionFocus && tweaks.directionFocus !== 'all'
    ? ['a','b','c'].filter(k => k !== tweaks.directionFocus).map(k => `[data-dc-section="dir-${k}"]`).join(', ')
    : '';

  return (
    <>
      {hideOther ? <style>{`${hideOther} { display: none !important; }`}</style> : null}
      <Wireframes key={tweaks.palette} />
      <TweaksPanel title="Tweaks">
        <TweakSection title="Focus">
          <TweakSelect
            label="Show direction"
            value={tweaks.directionFocus}
            onChange={(v) => setTweak('directionFocus', v)}
            options={[
              { value: 'all', label: 'All three' },
              { value: 'a', label: 'D1 · Form 27-A' },
              { value: 'b', label: 'D2 · Field Manual' },
              { value: 'c', label: 'D3 · Compliance Card' },
            ]}
          />
        </TweakSection>
        <TweakSection title="D2 palette">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PALETTE_OPTIONS.map(o => {
              const active = (tweaks.palette || 'orange') === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setTweak('palette', o.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px',
                    border: active ? '1.5px solid #0b2545' : '1px solid rgba(0,0,0,0.18)',
                    background: active ? '#f6f3eb' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'inline-flex', border: '1px solid rgba(0,0,0,0.25)' }}>
                    {o.sw.map((c,i) => (
                      <span key={i} style={{ width: 12, height: 18, background: c }} />
                    ))}
                  </span>
                  <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, fontWeight: active ? 700 : 500 }}>{o.label}</span>
                </button>
              );
            })}
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
