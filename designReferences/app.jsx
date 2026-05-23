// ─────────────────────────────────────────────────────────────
// APP — BolaoApp wrapper: state + navigation
// ─────────────────────────────────────────────────────────────

function BolaoApp({
  // overrides para apresentação em canvas (modo "static screenshot")
  forceView = null,        // override: 'login' | 'leagues' | 'dashboard' | 'matches' | ...
  forceModal = null,       // 'rules' | 'invite' | 'create-league' | null
  forceVariant = {},       // { dashboard: 'A'|'B'|'C', matches: 'A'|'B' }
  device = 'desktop',      // 'desktop' | 'mobile'
  palette: paletteOverride,
  leagueName: leagueNameOverride,
  initialUser,
  initialChampionBet,
  embedded = false,        // se true, evita postMessages para parent (uso em canvas)
}) {
  // Tweaks padrão (apenas se não embarcado)
  const defaultPalette = paletteOverride || {
    primary: '#FFC72C',     // amarelo destaque
    secondary: '#0097A9',   // turquesa
    dark: '#244C5A',        // azul petróleo
  };
  const defaultLeagueName = leagueNameOverride || 'Bolão Principal';

  // Estado real (com tweaks)
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "leagueName": "Bolão Principal",
    "primary": "#FFC72C",
    "secondary": "#0097A9",
    "dark": "#244C5A"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, () => {}];

  const palette = paletteOverride || {
    primary: tweaks.primary, secondary: tweaks.secondary, dark: tweaks.dark,
  };
  const leagueName = leagueNameOverride || tweaks.leagueName;

  // ─── State ───────────────────────────────────────────────
  const [view, setView] = React.useState(forceView || 'login');
  const [modal, setModal] = React.useState(forceModal);
  const [user, setUser] = React.useState(initialUser || {
    name: 'Igor Henrique', email: 'igor.h@empresa.com',
    avatar: 'IH', color: '#7E4FE3',
  });
  const [currentLeague, setCurrentLeague] = React.useState(forceView && forceView !== 'login' && forceView !== 'leagues' ? window.MOCK_LEAGUES[0] : null);
  const [hasSeenRules, setHasSeenRules] = React.useState(false);
  const [predictions, setPredictions] = React.useState({});
  const [championBet, setChampionBet] = React.useState(initialChampionBet || null);
  const [matchDetail, setMatchDetail] = React.useState(null);

  // ─── Handlers ─────────────────────────────────────────────
  const handleLogin = () => {
    setView('leagues');
  };
  const handleSelectLeague = (league) => {
    setCurrentLeague(league);
    if (!hasSeenRules) { setModal('rules'); }
    else { setView('dashboard'); }
  };
  const handleAcceptRules = () => {
    setHasSeenRules(true);
    setModal(null);
    if (!championBet) setView('champion-bet');
    else setView('dashboard');
  };
  const handleCreateLeague = (data) => {
    // data: { name, access, logo, prize }
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

  // ─── Pre-app views (login, leagues, champion-bet) ───────
  if (view === 'login') {
    return (
      <LoginContainer embedded={embedded} palette={palette}>
        <LoginScreen palette={palette} leagueName={leagueName} onLogin={handleLogin} device={device}/>
        {!embedded && <TweaksUI palette={palette} tweaks={tweaks} setTweak={setTweak}/>}
      </LoginContainer>
    );
  }

  if (view === 'leagues') {
    return (
      <>
        <LeaguesScreen palette={palette} user={user} leagues={window.MOCK_LEAGUES}
                       onSelectLeague={handleSelectLeague} onCreateLeague={handleCreateLeague}
                       onLogout={handleLogout} device={device}/>
        {modal === 'rules' && <RulesModal palette={palette} leagueName={currentLeague?.name || leagueName}
                                          onAccept={handleAcceptRules} scoringBreakdown={window.SCORING_BREAKDOWN}/>}
        {!embedded && <TweaksUI palette={palette} tweaks={tweaks} setTweak={setTweak}/>}
      </>
    );
  }

  if (view === 'champion-bet') {
    return (
      <>
        <ChampionBetScreen palette={palette} candidates={window.TOP_CANDIDATES.slice(0, 12)}
                           initialChampion={championBet?.champion} initialRunnerUp={championBet?.runnerUp}
                           onSave={handleSaveChampionBet} device={device}/>
        {!embedded && <TweaksUI palette={palette} tweaks={tweaks} setTweak={setTweak}/>}
      </>
    );
  }

  // ─── Authenticated app (com shell) ───────────────────────
  const content = (() => {
    if (view === 'dashboard') {
      return <DashboardScreen palette={palette} leagueName={currentLeague?.name || leagueName}
                              user={user} matches={window.MOCK_MATCHES} ranking={window.MOCK_RANKING}
                              championBet={championBet} variant={forceVariant.dashboard || 'A'}
                              device={device} onView={navigateView} onInvite={() => setModal('invite')}/>;
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
                            onInvite={() => setModal('invite')} user={user}/>;
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
        {content}
      </AppFrame>

      {/* Modais globais */}
      {modal === 'rules' && (
        <RulesModal palette={palette} leagueName={currentLeague?.name || leagueName}
                    onAccept={handleAcceptRules} onClose={() => setModal(null)}
                    scoringBreakdown={window.SCORING_BREAKDOWN}/>
      )}
      {modal === 'invite' && (
        <InviteModal palette={palette} leagueName={currentLeague?.name || leagueName}
                     onClose={() => setModal(null)}/>
      )}

      {!embedded && <TweaksUI palette={palette} tweaks={tweaks} setTweak={setTweak}/>}
    </>
  );
}

// Wrapper para preservar fundo escuro do login até hidratar
function LoginContainer({ children, embedded, palette }) {
  return <>{children}</>;
}

// ─── TWEAKS UI ──────────────────────────────────────────────
function TweaksUI({ palette, tweaks, setTweak }) {
  if (!window.TweaksPanel) return null;
  return (
    <window.TweaksPanel title="Tweaks">
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

Object.assign(window, { BolaoApp, TweaksUI });
