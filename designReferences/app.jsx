// ─────────────────────────────────────────────────────────────
// APP — BolaoApp wrapper: state + navigation
// ─────────────────────────────────────────────────────────────

function BolaoApp({
  // overrides para apresentação em canvas (modo "static screenshot")
  forceView = null,        // override: 'login' | 'leagues' | 'dashboard' | 'matches' | ...
  forceModal = null,       // 'rules' | 'invite' | 'create-league' | null
  forceVariant = {},       // { dashboard: 'A'|'B'|'C', matches: 'A'|'B' }
  device: deviceProp,      // 'desktop' | 'mobile' — quando definido, sobrescreve o tweak
  palette: paletteOverride,
  leagueName: leagueNameOverride,
  initialUser,
  initialChampionBet,
  embedded = false,        // se true, evita postMessages para parent (uso em canvas)
}) {
  // Estado real (com tweaks)
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "leagueName": "Bolão Principal",
    "primary": "#FFC72C",
    "secondary": "#0097A9",
    "dark": "#244C5A",
    "device": "desktop"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, () => {}];

  const palette = paletteOverride || {
    primary: tweaks.primary, secondary: tweaks.secondary, dark: tweaks.dark,
  };
  const leagueName = leagueNameOverride || tweaks.leagueName;
  // Device: prop explícito (canvas) ganha; senão, segue o tweak.
  const device = deviceProp || tweaks.device || 'desktop';

  // ─── State ───────────────────────────────────────────────
  const [view, setView] = React.useState(forceView || 'login');
  const [modal, setModal] = React.useState(forceModal);
  const [user, setUser] = React.useState(initialUser || {
    name: 'Igor Henrique', email: 'igor.h@empresa.com',
    avatar: 'IH', color: '#7E4FE3',
  });
  const [currentLeague, setCurrentLeague] = React.useState(forceView && forceView !== 'login' && forceView !== 'leagues' ? window.MOCK_LEAGUES[0] : null);
  const [hasSeenRules, setHasSeenRules] = React.useState(false);
  const [rulesShowInvite, setRulesShowInvite] = React.useState(false);
  const [predictions, setPredictions] = React.useState({});
  const [championBet, setChampionBet] = React.useState(initialChampionBet || null);
  const [matchDetail, setMatchDetail] = React.useState(null);

  // ─── Handlers ─────────────────────────────────────────────
  const handleLogin = () => {
    setView('leagues');
  };
  const handleSelectLeague = (league) => {
    setCurrentLeague(league);
    if (!hasSeenRules) { setRulesShowInvite(false); setModal('rules'); }
    else { setView('dashboard'); }
  };
  const handleAcceptRules = () => {
    setHasSeenRules(true);
    setModal(null);
    if (!championBet) setView('champion-bet');
    else setView('dashboard');
  };
  const handleCreateLeague = (data) => {
    const payload = typeof data === 'string' ? { name: data } : (data || {});
    const newLeague = {
      id: Date.now(),
      name: payload.name || 'Nova Liga',
      players: 1, owner: 'Você', color: '#7E4FE3', isPrincipal: false,
      access: payload.access || 'private',
      logo: payload.logo || null,
      prize: payload.prize || null,
    };
    setCurrentLeague(newLeague);
    setRulesShowInvite(true);
    setModal('rules');
  };
  const handleSaveChampionBet = (bet) => {
    setChampionBet(bet);
    setView('dashboard');
  };
  const handleLogout = () => {
    setUser({ name: 'Igor Henrique', email: 'igor.h@empresa.com', avatar: 'IH', color: '#7E4FE3' });
    setCurrentLeague(null);
    setView('login');
  };
  const navigateView = (v, payload) => {
    if (v === 'match-detail') { setMatchDetail(payload); setView('match-detail'); }
    else if (v === 'champion-bet') { setView('champion-bet'); }
    else { setView(v); }
  };
  const setOnePrediction = (id, value) => {
    setPredictions(prev => ({ ...prev, [id]: value }));
  };

  // ─── Render principal: monta o conteúdo da view, depois decide invólucro ──
  const renderContent = () => {
    if (view === 'login') {
      return (
        <LoginScreen palette={palette} leagueName={leagueName} onLogin={handleLogin} device={device}/>
      );
    }
    if (view === 'leagues') {
      return (
        <>
          <LeaguesScreen palette={palette} user={user} leagues={window.MOCK_LEAGUES}
                         onSelectLeague={handleSelectLeague} onCreateLeague={handleCreateLeague}
                         onLogout={handleLogout} device={device}/>
          {modal === 'rules' && <RulesModal palette={palette} leagueName={currentLeague?.name || leagueName}
                                            onAccept={handleAcceptRules} scoringBreakdown={window.SCORING_BREAKDOWN}
                                            showInvite={rulesShowInvite}/>}
        </>
      );
    }
    if (view === 'champion-bet') {
      return (
        <ChampionBetScreen palette={palette} candidates={window.TOP_CANDIDATES.slice(0, 12)}
                           initialChampion={championBet?.champion} initialRunnerUp={championBet?.runnerUp}
                           onSave={handleSaveChampionBet} device={device}/>
      );
    }

    // Authenticated app — usa shell
    const screen = (() => {
      if (view === 'dashboard') {
        return <DashboardScreen palette={palette} leagueName={currentLeague?.name || leagueName}
                                user={user} matches={window.MOCK_MATCHES} ranking={window.MOCK_RANKING}
                                championBet={championBet} variant={forceVariant.dashboard || 'A'}
                                device={device} onView={navigateView} onInvite={() => setModal('invite')}
                                prize={currentLeague?.prize}/>;
      }
      if (view === 'matches') {
        return <MatchesScreen palette={palette} matches={window.MOCK_MATCHES} groups={window.MOCK_GROUPS}
                              predictions={predictions} setPrediction={setOnePrediction}
                              onView={navigateView} leagueName={currentLeague?.name || leagueName}
                              variant={forceVariant.matches || 'A'} device={device}
                              onInvite={() => setModal('invite')} user={user}/>;
      }
      if (view === 'table') {
        return <TableScreen palette={palette} groups={window.MOCK_GROUPS}
                            leagueName={currentLeague?.name || leagueName} device={device}
                            onInvite={() => setModal('invite')} user={user}/>;
      }
      if (view === 'bracket') {
        return <BracketScreen palette={palette} bracketRounds={window.BRACKET_ROUNDS}
                              leagueName={currentLeague?.name || leagueName} device={device}
                              onInvite={() => setModal('invite')} user={user}/>;
      }
      if (view === 'ranking') {
        return <RankingScreen palette={palette} ranking={window.MOCK_RANKING}
                              leagueName={currentLeague?.name || leagueName} device={device}
                              onInvite={() => setModal('invite')} user={user}
                              prize={currentLeague?.prize}/>;
      }
      if (view === 'profile') {
        return <ProfileScreen palette={palette} user={user} setUser={setUser}
                              leagueName={currentLeague?.name || leagueName} device={device}
                              onInvite={() => setModal('invite')} onLogout={handleLogout}/>;
      }
      if (view === 'match-detail') {
        return <MatchDetailScreen palette={palette} match={matchDetail || window.MOCK_MATCHES[0]}
                                  prediction={predictions[(matchDetail || window.MOCK_MATCHES[0]).id]}
                                  setPrediction={(p) => setOnePrediction((matchDetail || window.MOCK_MATCHES[0]).id, p)}
                                  onBack={() => setView('matches')} leagueName={currentLeague?.name || leagueName}
                                  device={device} onInvite={() => setModal('invite')} user={user}/>;
      }
      return null;
    })();

    return (
      <>
        <AppFrame device={device} view={view} setView={(v) => navigateView(v)}
                  user={user} leagueName={currentLeague?.name || leagueName} palette={palette}
                  onInvite={() => setModal('invite')} onLogout={handleLogout}>
          {screen}
        </AppFrame>

        {modal === 'rules' && (
          <RulesModal palette={palette} leagueName={currentLeague?.name || leagueName}
                      onAccept={handleAcceptRules} onClose={() => setModal(null)}
                      scoringBreakdown={window.SCORING_BREAKDOWN}
                      showInvite={rulesShowInvite}/>
        )}
        {modal === 'invite' && (
          <InviteModal palette={palette} leagueName={currentLeague?.name || leagueName}
                       onClose={() => setModal(null)}/>
        )}
      </>
    );
  };

  // Invólucro: se mobile e não embarcado, renderiza dentro de um chassi de iPhone.
  const wrapped = (!embedded && device === 'mobile')
    ? <MobileShell palette={palette}>{renderContent()}</MobileShell>
    : renderContent();

  return (
    <>
      {wrapped}
      {!embedded && <TweaksUI palette={palette} tweaks={tweaks} setTweak={setTweak}/>}
    </>
  );
}

// ─── MOBILE SHELL — chassi de iPhone centrado em fundo escuro ────────
function MobileShell({ children, palette }) {
  React.useEffect(() => {
    const prevBg = document.body.style.background;
    const prevHtmlBg = document.documentElement.style.background;
    document.body.style.background = '#0b1014';
    document.documentElement.style.background = '#0b1014';
    return () => {
      document.body.style.background = prevBg;
      document.documentElement.style.background = prevHtmlBg;
    };
  }, []);

  // iPhone 14 Pro ≈ 393×852 ; usamos 390×844 que é o tamanho dos artboards do canvas
  const W = 390, H = 844;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '32px 16px 32px',
      background: '#0b1014',
    }}>
      <div style={{
        position: 'relative',
        width: W,
        height: H,
        borderRadius: 50,
        overflow: 'hidden',
        background: '#F6F8FA',
        // moldura do aparelho (anel preto + outline metálico) + sombra
        boxShadow: '0 0 0 6px #0a0d11, 0 0 0 7px #1f242b, 0 30px 80px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.4)',
        // cria containing block para descendentes position:fixed (bottom-nav, modais)
        transform: 'translateZ(0)',
      }}>
        {/* Status bar (44px) — sobreposta ao conteúdo */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px',
          zIndex: 70,
          fontFamily: '-apple-system, system-ui, sans-serif',
          fontSize: 15, fontWeight: 600,
          color: '#0a0d11',
          pointerEvents: 'none',
        }}>
          <span style={{ minWidth: 50, letterSpacing: '-0.02em' }}>9:41</span>
          <span style={{ minWidth: 110 }}/>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 50, justifyContent: 'flex-end' }}>
            {/* signal */}
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="4.5" y="5" width="3" height="6" rx="0.5"/><rect x="9" y="2.5" width="3" height="8.5" rx="0.5"/><rect x="13.5" y="0" width="3" height="11" rx="0.5"/></svg>
            {/* battery */}
            <svg width="25" height="11" viewBox="0 0 25 11"><rect x="0.5" y="0.5" width="21" height="10" rx="2.5" fill="none" stroke="currentColor" strokeOpacity="0.4"/><rect x="22.5" y="3.5" width="1.5" height="4" rx="0.5" fill="currentColor" fillOpacity="0.4"/><rect x="2" y="2" width="18" height="7" rx="1.5" fill="currentColor"/></svg>
          </span>
        </div>

        {/* Dynamic island */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          width: 118, height: 34, borderRadius: 20, background: '#000', zIndex: 80,
          pointerEvents: 'none',
        }}/>

        {/* Scrollable canvas */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          overflowY: 'auto', overflowX: 'hidden',
          paddingTop: 44, // empurra conteúdo abaixo da status bar
        }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          width: 134, height: 5, borderRadius: 100,
          background: 'rgba(10,13,17,0.35)',
          zIndex: 90, pointerEvents: 'none',
        }}/>
      </div>
    </div>
  );
}

// ─── TWEAKS UI ──────────────────────────────────────────────
function TweaksUI({ palette, tweaks, setTweak }) {
  if (!window.TweaksPanel) return null;
  return (
    <window.TweaksPanel title="Tweaks">
      <window.TweakSection label="Visualização"/>
      <window.TweakRadio label="Dispositivo" value={tweaks.device || 'desktop'}
        options={[
          { value: 'desktop', label: 'Desktop' },
          { value: 'mobile',  label: 'Mobile' },
        ]}
        onChange={(v) => setTweak('device', v)}/>

      <window.TweakSection label="Identidade"/>
      <window.TweakText label="Nome do bolão" value={tweaks.leagueName}
                        onChange={(v) => setTweak('leagueName', v)}/>

      <window.TweakSection label="Paleta de cores"/>
      <window.TweakColor label="Paleta" value={[tweaks.primary, tweaks.secondary, tweaks.dark]}
        options={[
          ['#FFC72C', '#0097A9', '#244C5A'],  // Padrão (amarelo · turquesa · petróleo)
          ['#FFD700', '#1B4332', '#0A1929'],  // Verde campo + dourado
          ['#FF6B35', '#004E89', '#1A1A2E'],  // Vermelho/azul/preto - Copa USA
          ['#F7B538', '#DB504A', '#26343F'],  // Tradicional brasileiro
          ['#E94560', '#0F3460', '#16213E'],  // Roxo-rosado moderno
          ['#06D6A0', '#073B4C', '#FFD166'],  // Tropical
        ]}
        onChange={(v) => setTweak({ primary: v[0], secondary: v[1], dark: v[2] })}/>

      <window.TweakSection label="Componentes individuais (opcional)"/>
      <window.TweakColor label="Primária" value={tweaks.primary}
        options={['#FFC72C', '#F7B538', '#FFD700', '#FF6B35', '#06D6A0']}
        onChange={(v) => setTweak('primary', v)}/>
      <window.TweakColor label="Secundária" value={tweaks.secondary}
        options={['#0097A9', '#1B4332', '#004E89', '#DB504A', '#073B4C']}
        onChange={(v) => setTweak('secondary', v)}/>
      <window.TweakColor label="Escuro" value={tweaks.dark}
        options={['#244C5A', '#0A1929', '#1A1A2E', '#26343F', '#16213E']}
        onChange={(v) => setTweak('dark', v)}/>
    </window.TweaksPanel>
  );
}

Object.assign(window, { BolaoApp, TweaksUI, MobileShell });
