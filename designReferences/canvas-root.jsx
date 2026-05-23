// ─────────────────────────────────────────────────────────────
// CANVAS ROOT — Design canvas para o Bolão da Copa 2026
// Cada artboard renderiza UMA screen diretamente (não o app inteiro)
// para manter performance — 20+ instances de BolaoApp travavam o browser.
// ─────────────────────────────────────────────────────────────

const CANVAS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "leagueName": "Bolão Principal",
  "primary": "#FFC72C",
  "secondary": "#0097A9",
  "dark": "#244C5A"
}/*EDITMODE-END*/;

const SAMPLE_USER = {
  name: 'Igor Henrique', email: 'igor.h@empresa.com',
  avatar: 'IH', color: '#7E4FE3',
};
const SAMPLE_BET = { champion: 'Brasil', runnerUp: 'França' };

const DESKTOP_W = 1280, DESKTOP_H = 880;
const MOBILE_W = 390, MOBILE_H = 800;

// ─────────────────────────────────────────────────────────────
// ScreenArtboard — renderiza UMA screen com shell apropriado
// Props: name, device, variant, palette, leagueName, modal
// ─────────────────────────────────────────────────────────────
function ScreenArtboard({ name, device = 'desktop', variant = {}, palette, leagueName, modal, customRender }) {
  const noop = () => {};
  const view = name === 'palpites' ? 'matches'
              : name === 'palpites-table' || name === 'table' ? 'table'
              : name === 'mata-mata' ? 'bracket' : name;
  const setView = noop;

  // Custom override for things like "matches-table-only"
  if (customRender) {
    return (
      <div className={`artboard-content ${device === 'mobile' ? 'mobile' : ''}`}>
        {customRender({ palette, leagueName, device })}
      </div>
    );
  }

  // Screens that DON'T use AppFrame
  if (name === 'login') {
    return (
      <div className={`artboard-content ${device === 'mobile' ? 'mobile' : ''}`}>
        <window.LoginScreen palette={palette} leagueName={leagueName} onLogin={noop} device={device}/>
      </div>
    );
  }
  if (name === 'leagues') {
    return (
      <div className={`artboard-content ${device === 'mobile' ? 'mobile' : ''}`}>
        <window.LeaguesScreen palette={palette} user={SAMPLE_USER} leagues={window.MOCK_LEAGUES}
                              onSelectLeague={noop} onCreateLeague={noop} onLogout={noop} device={device}/>
        {modal === 'rules' && (
          <window.RulesModal palette={palette} leagueName={leagueName}
                             onAccept={noop} scoringBreakdown={window.SCORING_BREAKDOWN}/>
        )}
        {modal === 'create-league' && (
          <window.CreateLeagueModal palette={palette} onClose={noop} onCreate={noop}/>
        )}
      </div>
    );
  }
  if (name === 'champion-bet') {
    return (
      <div className={`artboard-content ${device === 'mobile' ? 'mobile' : ''}`}>
        <window.ChampionBetScreen palette={palette} candidates={window.TOP_CANDIDATES.slice(0, 12)}
                                  onSave={noop} device={device}/>
      </div>
    );
  }

  // Screens that USE the AppFrame shell
  const inner = (() => {
    if (view === 'dashboard') {
      return <window.DashboardScreen palette={palette} leagueName={leagueName}
        user={SAMPLE_USER} matches={window.MOCK_MATCHES} ranking={window.MOCK_RANKING}
        championBet={SAMPLE_BET} variant={variant.dashboard || 'A'}
        device={device} onView={noop} onInvite={noop}/>;
    }
    if (view === 'matches') {
      return <window.MatchesScreen palette={palette} matches={window.MOCK_MATCHES} groups={window.MOCK_GROUPS}
        predictions={{}} setPrediction={noop} onView={noop}
        leagueName={leagueName} variant={variant.matches || 'A'} device={device}
        onInvite={noop} user={SAMPLE_USER}/>;
    }
    if (view === 'table') {
      return <window.TableScreen palette={palette} groups={window.MOCK_GROUPS}
        leagueName={leagueName} device={device} onInvite={noop} user={SAMPLE_USER}/>;
    }
    if (view === 'bracket') {
      return <window.BracketScreen palette={palette} bracketRounds={window.BRACKET_ROUNDS}
        leagueName={leagueName} device={device} onInvite={noop} user={SAMPLE_USER}/>;
    }
    if (view === 'ranking') {
      return <window.RankingScreen palette={palette} ranking={window.MOCK_RANKING}
        leagueName={leagueName} device={device} onInvite={noop} user={SAMPLE_USER}/>;
    }
    if (view === 'profile') {
      return <window.ProfileScreen palette={palette} user={SAMPLE_USER} setUser={noop}
        leagueName={leagueName} device={device} onInvite={noop} onLogout={noop}/>;
    }
    if (view === 'match-detail') {
      return <window.MatchDetailScreen palette={palette} match={window.MOCK_MATCHES[2]}
        prediction={{ a: 2, b: 1 }} setPrediction={noop} onBack={noop}
        leagueName={leagueName} device={device} onInvite={noop} user={SAMPLE_USER}/>;
    }
    return <div className="p-10 text-slate-500">Tela: {name}</div>;
  })();

  return (
    <div className={`artboard-content ${device === 'mobile' ? 'mobile' : ''}`}>
      <window.AppFrame device={device} view={view} setView={setView}
        user={SAMPLE_USER} leagueName={leagueName} palette={palette}
        onInvite={noop} onLogout={noop}>
        {inner}
      </window.AppFrame>
      {modal === 'invite' && (
        <window.InviteModal palette={palette} leagueName={leagueName} onClose={noop}/>
      )}
    </div>
  );
}

// "Tabela de Grupos" only — overrides MatchesScreen para abrir na aba Tabela
function MatchesTableOnly({ palette, leagueName, device }) {
  const noop = () => {};
  return (
    <window.AppFrame device={device} view="matches" setView={noop}
      user={SAMPLE_USER} leagueName={leagueName} palette={palette}
      onInvite={noop} onLogout={noop}>
      <window.Topbar palette={palette} title="Palpites & Tabela"
        subtitle="Aba Tabela aberta · classificação inicial dos 12 grupos."
        breadcrumb={<><window.Icon name="list" size={12}/><span>Fase de grupos</span></>}/>
      <div className="mb-5 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 w-fit">
        <button className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 text-slate-500">
          <window.Icon name="calendar" size={14}/> Jogos
        </button>
        <button className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 bg-white shadow"
                style={{ color: palette.secondary }}>
          <window.Icon name="list" size={14}/> Tabela
        </button>
      </div>
      <window.GroupsTable palette={palette} groups={window.MOCK_GROUPS}/>
    </window.AppFrame>
  );
}

// ─────────────────────────────────────────────────────────────
// CANVAS INTRO BANNER
// ─────────────────────────────────────────────────────────────
function CanvasIntro({ palette }) {
  return (
    <div style={{ padding: 30, fontFamily: 'Montserrat, sans-serif', height: '100%', boxSizing: 'border-box' }}>
      <div style={{
        background: `linear-gradient(135deg, ${palette.dark} 0%, ${palette.secondary} 100%)`,
        borderRadius: 32, padding: '36px 44px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 32, flexWrap: 'wrap', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240,
                      borderRadius: '50%', background: palette.primary, opacity: 0.18, filter: 'blur(80px)' }}/>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '6px 12px', borderRadius: 999,
                        background: `${palette.primary}30`, color: palette.primary,
                        fontSize: 10, fontWeight: 900, letterSpacing: '0.25em',
                        textTransform: 'uppercase', marginBottom: 12 }}>
            Bolão da Copa 2026 · Handoff
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.1, margin: 0,
                       letterSpacing: '-0.02em' }}>
            Bolão da empresa, pronto pro <span style={{ color: palette.primary }}>Claude Code</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14, lineHeight: 1.5 }}>
            12 telas + 2 variações de Painel · Variações de Palpites · Desktop e Mobile lado a lado · Cores e nome ajustáveis via <b style={{ color: palette.primary }}>Tweaks</b>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <a href="Prototipo.html" target="_blank" rel="noreferrer"
            style={{ padding: '14px 24px', borderRadius: 18, background: palette.primary,
                     color: palette.dark, fontWeight: 900, fontSize: 14, textDecoration: 'none',
                     display: 'inline-flex', alignItems: 'center', gap: 8,
                     boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            <span>▶</span> Abrir protótipo interativo
          </a>
        </div>
      </div>

      {/* Specs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12, marginTop: 16 }}>
        {[
          { k: '48', l: 'Seleções (A·C·L oficiais)' },
          { k: '12', l: 'Grupos' },
          { k: '72', l: 'Jogos · Fase de grupos' },
          { k: '6', l: 'Fases eliminatórias' },
          { k: '4×', l: 'Multiplicador na Final' },
          { k: 'React', l: 'Tailwind + Lucide' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 16, padding: '14px 18px',
                                 border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: palette.dark, lineHeight: 1 }}>{s.k}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CANVAS ROOT
// ─────────────────────────────────────────────────────────────
function CanvasRoot() {
  const [tweaks, setTweak] = window.useTweaks(CANVAS_DEFAULTS);
  const palette = { primary: tweaks.primary, secondary: tweaks.secondary, dark: tweaks.dark };
  const leagueName = tweaks.leagueName;

  // shorthand factory
  const SA = (props) => <ScreenArtboard {...props} palette={palette} leagueName={leagueName}/>;

  return (
    <React.Fragment>
      <window.DesignCanvas>
        {/* INTRO — primeira "seção" com banner de contexto */}
        <window.DCSection id="intro" title="Bolão Copa 2026 · Handoff"
                          subtitle="Visão geral do protótipo · use Tweaks pra trocar paleta e nome">
          <window.DCArtboard id="intro-banner" label="📋 Sobre este protótipo" width={1280} height={460}>
            <div className="artboard-content" style={{ width: '100%', height: '100%' }}>
              <CanvasIntro palette={palette}/>
            </div>
          </window.DCArtboard>
        </window.DCSection>

        {/* 1 — ONBOARDING */}
        <window.DCSection id="onboarding" title="1 · Onboarding"
                          subtitle="SSO Google → Escolha de liga → Regras → Aposta inicial de Campeão/Vice">
          <window.DCArtboard id="login" label="01 · Login (SSO Google)" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="login"/>
          </window.DCArtboard>
          <window.DCArtboard id="leagues" label="02 · Minhas Ligas" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="leagues"/>
          </window.DCArtboard>
          <window.DCArtboard id="rules-modal" label="03 · Regras (modal de onboarding)" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="leagues" modal="rules"/>
          </window.DCArtboard>
          <window.DCArtboard id="champion-bet" label="04 · Aposta de Campeão & Vice" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="champion-bet"/>
          </window.DCArtboard>
        </window.DCSection>

        {/* 2 — APP DESKTOP */}
        <window.DCSection id="desktop-app" title="2 · App principal · Desktop"
                          subtitle="Painel · Palpites · Tabela · Mata-mata · Ranking · Perfil · Detalhe">
          <window.DCArtboard id="dashboard" label="05 · Painel (Dashboard)" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="dashboard"/>
          </window.DCArtboard>
          <window.DCArtboard id="palpites" label="06 · Palpites (com filtros Hoje/Amanhã)" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="palpites"/>
          </window.DCArtboard>
          <window.DCArtboard id="palpites-table" label="07 · Tabela (menu próprio)" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="table"/>
          </window.DCArtboard>
          <window.DCArtboard id="bracket" label="08 · Chaveamento (Mata-mata)" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="mata-mata"/>
          </window.DCArtboard>
          <window.DCArtboard id="ranking" label="09 · Ranking da liga" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="ranking"/>
          </window.DCArtboard>
          <window.DCArtboard id="profile" label="10 · Perfil do usuário" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="profile"/>
          </window.DCArtboard>
          <window.DCArtboard id="match-detail" label="11 · Detalhe de jogo" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="match-detail"/>
          </window.DCArtboard>
        </window.DCSection>

        {/* 3 — MOBILE */}
        <window.DCSection id="mobile-app" title="3 · App principal · Mobile"
                          subtitle="iPhone 14 (390×800) · Bottom-nav · Cards adaptados">
          <window.DCArtboard id="m-login" label="📱 Login" width={MOBILE_W} height={MOBILE_H}>
            <SA name="login" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-leagues" label="📱 Ligas" width={MOBILE_W} height={MOBILE_H}>
            <SA name="leagues" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-champion" label="📱 Aposta Campeão" width={MOBILE_W} height={MOBILE_H}>
            <SA name="champion-bet" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-dashboard" label="📱 Painel" width={MOBILE_W} height={MOBILE_H}>
            <SA name="dashboard" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-matches" label="📱 Palpites" width={MOBILE_W} height={MOBILE_H}>
            <SA name="palpites" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-table" label="📱 Tabela" width={MOBILE_W} height={MOBILE_H}>
            <SA name="table" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-bracket" label="📱 Mata-mata" width={MOBILE_W} height={MOBILE_H}>
            <SA name="mata-mata" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-ranking" label="📱 Ranking" width={MOBILE_W} height={MOBILE_H}>
            <SA name="ranking" device="mobile"/>
          </window.DCArtboard>
          <window.DCArtboard id="m-profile" label="📱 Perfil" width={MOBILE_W} height={MOBILE_H}>
            <SA name="profile" device="mobile"/>
          </window.DCArtboard>
        </window.DCSection>

        {/* 4 — VARIAÇÕES DASHBOARD */}
        <window.DCSection id="dashboard-variants" title="4 · Variações do Painel"
                          subtitle="3 jeitos de receber o usuário · escolha um (ou alterne via Tweaks)">
          <window.DCArtboard id="dA" label="Var A · Stats Grid" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="dashboard" variant={{ dashboard: 'A' }}/>
          </window.DCArtboard>
          <window.DCArtboard id="dB" label="Var B · Hero próximo jogo" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="dashboard" variant={{ dashboard: 'B' }}/>
          </window.DCArtboard>
          <window.DCArtboard id="dC" label="Var C · Timeline" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="dashboard" variant={{ dashboard: 'C' }}/>
          </window.DCArtboard>
          <window.DCPostIt>Sugestão · Var B funciona melhor em mobile (visual e direto). Var A pra desktop.</window.DCPostIt>
        </window.DCSection>

        {/* 5 — VARIAÇÕES PALPITES */}
        <window.DCSection id="palpites-variants" title="5 · Variações de Palpites"
                          subtitle="Cards convidativos vs lista densa para power users">
          <window.DCArtboard id="pA" label="Var A · Cards expandidos" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="palpites" variant={{ matches: 'A' }}/>
          </window.DCArtboard>
          <window.DCArtboard id="pB" label="Var B · Lista compacta" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="palpites" variant={{ matches: 'B' }}/>
          </window.DCArtboard>
          <window.DCPostIt>Cards (A) ganha em onboarding. Lista (B) ganha quando o usuário já palpita 70+ jogos.</window.DCPostIt>
        </window.DCSection>

        {/* 6 — MODAIS */}
        <window.DCSection id="modais" title="6 · Modais & microflows"
                          subtitle="Convite, criação de liga, momentos pequenos">
          <window.DCArtboard id="invite" label="Modal · Convite (link + QR + WhatsApp)" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="dashboard" modal="invite"/>
          </window.DCArtboard>
          <window.DCArtboard id="create" label="Modal · Criar nova liga" width={DESKTOP_W} height={DESKTOP_H}>
            <SA name="leagues" modal="create-league"/>
          </window.DCArtboard>
          <window.DCArtboard id="invite-m" label="📱 Convite mobile" width={MOBILE_W} height={MOBILE_H}>
            <SA name="dashboard" modal="invite" device="mobile"/>
          </window.DCArtboard>
        </window.DCSection>
      </window.DesignCanvas>

      <window.TweaksUI palette={palette} tweaks={tweaks} setTweak={setTweak}/>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<CanvasRoot/>);
