// App root for the RALKREDUX prototype
// Owns: navigation state, theme provider, sheet/screen routing.

function PrototypeApp({ initialTheme = 'tungsten', startScreen = 'today', forcedScreen, hideTabs = false, snapshot, frameRef }) {
  // Apply theme to the root element (so the iOS frame's bezel doesn't get affected).
  return (
    <window.ThemeProvider initial={initialTheme} target={frameRef}>
      <AppShell startScreen={startScreen} forcedScreen={forcedScreen} hideTabs={hideTabs} snapshot={snapshot} />
    </window.ThemeProvider>
  );
}

function AppShell({ startScreen, forcedScreen, hideTabs, snapshot }) {
  const [tab, setTab] = React.useState(startScreen);
  const [stack, setStack] = React.useState([]); // overlay screens: { kind, id }
  const [newOpen, setNewOpen] = React.useState(false);
  const [splash, setSplash] = React.useState(snapshot === 'splash');
  const [onboarded, setOnboarded] = React.useState(snapshot !== 'onboarding');
  const { setTheme, theme } = window.useTheme();

  // External-driven screen override (for snapshot/canvas use)
  React.useEffect(() => {
    if (!forcedScreen) return;
    if (forcedScreen.kind === 'tab') { setTab(forcedScreen.id); setStack([]); }
    else if (forcedScreen.kind === 'detail') { setStack([{ kind: 'detail', id: forcedScreen.id || 'e008' }]); }
    else if (forcedScreen.kind === 'sign')   { setStack([{ kind: 'sign', id: forcedScreen.id || 'e009' }]); }
    else if (forcedScreen.kind === 'export') { setStack([{ kind: 'export' }]); }
    else if (forcedScreen.kind === 'gear-detail') { setStack([{ kind: 'gear-detail', id: forcedScreen.id || 'g_helmet_vertex' }]); }
    else if (forcedScreen.kind === 'new')    { setNewOpen(true); }
    else if (forcedScreen.kind === 'sealed') { setStack([{ kind: 'sign', id: 'e009', stage: 'sealed' }]); }
  }, [forcedScreen]);

  // Auto-dismiss splash
  React.useEffect(() => {
    if (!splash) return;
    const t = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(t);
  }, [splash]);

  const openEntry = (id) => setStack((s) => [...s, { kind: 'detail', id }]);
  const openSign = (id) => setStack((s) => [...s, { kind: 'sign', id }]);
  const openExport = () => setStack((s) => [...s, { kind: 'export' }]);
  const openGear = (id) => setStack((s) => [...s, { kind: 'gear-detail', id }]);
  const pop = () => setStack((s) => s.slice(0, -1));

  if (!onboarded) {
    return (
      <div className="rk-root" data-theme={theme}>
        <window.Onboarding onDone={() => setOnboarded(true)} />
      </div>
    );
  }

  const top = stack[stack.length - 1];

  return (
    <div className="rk-root" data-theme={theme}>
      {/* Base tab content */}
      {!top && tab === 'today' ? (
        <window.TodayScreen
          summary={window.MOCK_SUMMARY}
          profile={window.MOCK_PROFILE}
          lastSigned={window.MOCK_ENTRIES.find((e) => e.status === 'signed')}
          onOpenEntry={openEntry}
          onSync={() => {}}
          onTheme={() => setTab('profile')}
        />
      ) : null}
      {!top && tab === 'records' ? (
        <window.RecordsScreen onOpenEntry={openEntry} onNew={() => setNewOpen(true)} />
      ) : null}
      {!top && tab === 'gear' ? (
        <window.GearScreen onAdd={() => {}} onOpen={openGear} />
      ) : null}
      {!top && tab === 'profile' ? (
        <window.ProfileScreen onTheme={setTheme} onExport={openExport} />
      ) : null}

      {/* Overlay screens */}
      {top?.kind === 'detail' ? (
        <window.RecordDetail entryId={top.id} onBack={pop} onSign={() => setStack((s) => [...s.slice(0, -1), { kind: 'sign', id: top.id }])} />
      ) : null}
      {top?.kind === 'sign' ? (
        <window.SignScreen entryId={top.id} onBack={pop} onSigned={() => { pop(); setTab('records'); }} />
      ) : null}
      {top?.kind === 'export' ? (
        <window.ExportScreen onBack={pop} />
      ) : null}
      {top?.kind === 'gear-detail' ? (
        <window.GearDetail gearId={top.id} onBack={pop} />
      ) : null}

      {/* New entry sheet */}
      <window.NewEntryFlow
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onComplete={() => { setNewOpen(false); setStack([{ kind: 'sign', id: 'e009' }]); }}
      />

      {/* Tabs */}
      {!hideTabs && !top ? (
        <window.TabBar active={tab} onChange={setTab} onNewPress={() => setNewOpen(true)} />
      ) : null}

      {/* Splash overlay */}
      {splash ? <window.Splash /> : null}
    </div>
  );
}

Object.assign(window, { PrototypeApp, AppShell });
