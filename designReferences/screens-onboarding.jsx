// ─────────────────────────────────────────────────────────────
// ONBOARDING SCREENS — Login · Leagues · Rules · ChampionBet · Invite
// ─────────────────────────────────────────────────────────────

// ── LOGIN ────────────────────────────────────────────────────
function LoginScreen({ palette, leagueName, onLogin, device }) {
  const isMobile = device === 'mobile';
  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden"
    style={{ background: palette.dark }}>
      {/* Background grid + glows */}
      <div className="absolute inset-0 opacity-[0.07]"
      style={{ backgroundImage: `linear-gradient(${palette.primary} 1px, transparent 1px), linear-gradient(90deg, ${palette.primary} 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>
      <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
      style={{ background: palette.secondary }}></div>
      <div className="absolute -bottom-40 -left-20 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
      style={{ background: palette.primary }}></div>

      {/* Numerais decorativos massivos */}
      <div className="absolute top-10 right-10 font-black opacity-[0.04] select-none pointer-events-none"
      style={{ color: palette.primary, fontSize: isMobile ? '8rem' : '14rem', letterSpacing: '-0.05em', lineHeight: 1 }}>2026</div>

      <div className={`relative z-10 w-full ${isMobile ? 'max-w-sm' : 'max-w-lg'}`}>
        {/* Header com tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: `${palette.primary}20`, color: palette.primary }}>
            <Icon name="fire" size={12} />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Copa Mundo · USA · CAN · MEX</span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center -rotate-6"
            style={{ background: palette.primary }}>
              <Icon name="trophy" size={32} style={{ color: palette.dark }} strokeWidth={2.5} />
            </div>
            <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} font-black text-white leading-none`}
            style={{ letterSpacing: '-0.03em' }}>BOLÃO</div>
          </div>
          <p className={`${isMobile ? 'text-base' : 'text-xl'} font-bold tracking-widest uppercase`}
          style={{ color: palette.secondary }}>{leagueName}</p>
        </div>

        {/* Card de login */}
        <div className="rounded-[36px] p-8 border backdrop-blur-2xl"
        style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}>
          <h2 className="text-white text-lg font-bold mb-1">Entre para jogar 🎯</h2>
          <p className="text-white/60 text-sm mb-6">Use sua conta Google da empresa.</p>

          <button onClick={onLogin}
          className="w-full bg-white text-slate-900 font-bold py-4 px-6 rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition shadow-xl flex items-center justify-center gap-3">
            <Icon name="google" size={20} />
            <span>Continuar com Google</span>
          </button>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-white/40 text-[11px]">
            <Icon name="lock" size={12} />
            <span>Autenticado via Google · SSO seguro</span>
          </div>
        </div>

        {/* Mini-stats teaser */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
          { val: '48', label: 'Seleções' },
          { val: '104', label: 'Jogos' },
          { val: '87', label: 'Jogando' }].
          map((s, i) =>
          <div key={i} className="text-center p-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="text-2xl font-black" style={{ color: palette.primary }}>{s.val}</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50">{s.label}</div>
            </div>
          )}
        </div>
      </div>
    </div>);

}

// ── LEAGUES ──────────────────────────────────────────────────
function LeaguesScreen({ palette, user, leagues, onSelectLeague, onCreateLeague, onLogout, device }) {
  const isMobile = device === 'mobile';
  const [showCreate, setShowCreate] = React.useState(false);
  return (
    <div className="min-h-screen relative" style={{ background: '#F6F8FA' }}>
      {/* Hero faixa */}
      <div className="relative overflow-hidden pb-32 px-6 pt-12"
      style={{ background: palette.dark }}>
        <div className="absolute -top-10 right-10 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: palette.primary }}></div>
        <div className="absolute bottom-0 left-0 w-full h-1"
        style={{ background: `linear-gradient(90deg, ${palette.primary}, ${palette.secondary})` }}></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: palette.primary }}>
                <Icon name="trophy" size={20} style={{ color: palette.dark }} strokeWidth={2.5} />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-widest" style={{ color: palette.primary }}>Bolão Copa</div>
                <div className="text-white font-black text-sm">2026</div>
              </div>
            </div>
            <button onClick={onLogout} className="text-white/60 hover:text-white text-sm flex items-center gap-2">
              <Icon name="logout" size={14} /> Sair
            </button>
          </div>

          <div className="text-white">
            <p className="text-sm opacity-60 mb-2">E aí, <span className="font-bold">{user.name?.split(' ')[0]}</span> 👋</p>
            <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-black leading-tight mb-3`}
            style={{ letterSpacing: '-0.02em' }}>
              Suas ligas <span style={{ color: palette.primary }}>te esperam</span>
            </h1>
            <p className="text-white/70 max-w-md">Escolha uma liga para palpitar ou crie uma nova com a galera.</p>
          </div>
        </div>
      </div>

      {/* Lista de ligas — sobreposta */}
      <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-10 pb-12">
        <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {leagues.map((league) =>
          <button key={league.id} onClick={() => onSelectLeague(league)}
          className="bg-white rounded-[28px] p-6 text-left shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 border border-slate-100 group relative overflow-hidden">
              {league.isPrincipal &&
            <div className="absolute top-4 right-4">
                  <Badge color={palette.primary} tone="solid">Principal</Badge>
                </div>
            }
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 -rotate-3 group-hover:rotate-0 transition-transform overflow-hidden"
            style={{ background: league.color, color: 'white' }}>
                {league.logo ? <img src={league.logo} alt="" className="w-full h-full object-cover"/>
                  : <Icon name="shield" size={28} strokeWidth={2.5} />}
              </div>
              <h3 className="text-lg font-black mb-1 leading-tight" style={{ color: palette.dark }}>
                {league.name}
              </h3>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Icon name="users" size={12} />
                <span>{league.players} participantes</span>
                <span className="text-slate-300">·</span>
                <span>{league.owner}</span>
              </div>
              <div className="flex items-center gap-1 mt-5 pt-4 border-t border-slate-100 text-xs font-bold uppercase tracking-widest"
            style={{ color: palette.secondary }}>
                <span>Entrar</span>
                <Icon name="arrowRight" size={12} />
              </div>
            </button>
          )}

          {/* Card criar nova */}
          <button onClick={() => setShowCreate(true)}
          className="rounded-[28px] p-6 text-left border-2 border-dashed transition-all duration-200 hover:scale-[1.02] flex flex-col items-center justify-center min-h-[200px]"
          style={{ borderColor: `${palette.secondary}40`, background: `${palette.secondary}08` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: palette.secondary, color: 'white' }}>
              <Icon name="plus" size={28} strokeWidth={3} />
            </div>
            <h3 className="text-base font-black" style={{ color: palette.dark }}>Criar nova liga</h3>
            <p className="text-xs text-slate-500 mt-1 text-center">Convide amigos de fora também</p>
          </button>
        </div>

        {/* Info banner */}
        <div className="mt-10 rounded-3xl p-6 flex items-center gap-4 border"
        style={{ background: `${palette.primary}15`, borderColor: `${palette.primary}30` }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: palette.primary }}>
            <Icon name="fire" size={22} style={{ color: palette.dark }} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-black" style={{ color: palette.dark }}>A Copa começa em 21 dias</div>
            <div className="text-xs text-slate-600">Não esqueça: palpite de Campeão fecha 1h antes do 1º jogo!</div>
          </div>
        </div>
      </div>

      {showCreate && <CreateLeagueModal palette={palette} onClose={() => setShowCreate(false)} onCreate={(data) => {onCreateLeague(data);setShowCreate(false);}} />}
    </div>);

}

// ── CREATE LEAGUE MODAL ──────────────────────────────────────
function CreateLeagueModal({ palette, onClose, onCreate }) {
  const [name, setName] = React.useState('');
  const [access, setAccess] = React.useState('private'); // 'open' | 'private'
  const [logo, setLogo] = React.useState(null); // dataURL
  const [hasPrize, setHasPrize] = React.useState(false);
  const [prize, setPrize] = React.useState('');
  const fileRef = React.useRef(null);

  const onLogoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(f);
  };

  const submit = () => {
    onCreate({
      name: name || 'Nova Liga',
      access,
      logo,
      prize: hasPrize ? prize : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: `${palette.dark}cc` }} onClick={onClose}>
      <div className="bg-white rounded-[36px] shadow-2xl max-w-md w-full overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-black" style={{ color: palette.dark }}>Nova Liga</h3>
            <p className="text-xs text-slate-500">Configure sua liga para começar</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Logo + nome */}
          <div className="flex items-center gap-4">
            <button onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden shrink-0 hover:scale-105 transition"
              style={{ borderColor: `${palette.secondary}40`, background: `${palette.secondary}08` }}>
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-cover"/>
              ) : (
                <div className="text-center">
                  <Icon name="camera" size={20} style={{ color: palette.secondary, margin: '0 auto' }}/>
                  <div className="text-[9px] font-bold mt-1" style={{ color: palette.secondary }}>LOGO</div>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} className="hidden"/>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5">Nome da liga</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Liga da TI"
                className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-current focus:outline-none transition font-bold text-sm"
                style={{ color: palette.dark }} />
              {!logo && (
                <button onClick={() => fileRef.current?.click()}
                  className="text-[10px] font-bold mt-1.5 flex items-center gap-1 hover:underline"
                  style={{ color: palette.secondary }}>
                  <Icon name="camera" size={10}/> Enviar logo (opcional)
                </button>
              )}
            </div>
          </div>

          {/* Acesso: Aberta vs Privada */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Acesso à liga</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAccess('open')}
                className={`p-4 rounded-2xl border-2 text-left transition`}
                style={access === 'open'
                  ? { background: `${palette.secondary}15`, borderColor: palette.secondary }
                  : { background: '#F8FAFC', borderColor: 'transparent' }}>
                <Icon name="users" size={16}
                  style={{ color: access === 'open' ? palette.secondary : '#94a3b8' }}/>
                <div className="text-sm font-black mt-1.5" style={{ color: palette.dark }}>Aberta</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Qualquer um pode encontrar e entrar</div>
              </button>
              <button onClick={() => setAccess('private')}
                className={`p-4 rounded-2xl border-2 text-left transition`}
                style={access === 'private'
                  ? { background: `${palette.secondary}15`, borderColor: palette.secondary }
                  : { background: '#F8FAFC', borderColor: 'transparent' }}>
                <Icon name="lock" size={16}
                  style={{ color: access === 'private' ? palette.secondary : '#94a3b8' }}/>
                <div className="text-sm font-black mt-1.5" style={{ color: palette.dark }}>Privada</div>
                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">Só entra quem tem o link de convite</div>
              </button>
            </div>
          </div>

          {/* Prêmio */}
          <div>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer">
              <input type="checkbox" checked={hasPrize} onChange={(e) => setHasPrize(e.target.checked)}
                className="w-5 h-5 rounded accent-current" style={{ accentColor: palette.secondary }} />
              <div className="flex-1">
                <div className="text-sm font-bold flex items-center gap-2" style={{ color: palette.dark }}>
                  <Icon name="award" size={14} style={{ color: palette.primary }}/>
                  Tem prêmio para os campeões?
                </div>
                <div className="text-[10px] text-slate-500">Descreva o que está em jogo (rola incentivo extra 😏)</div>
              </div>
            </label>
            {hasPrize && (
              <textarea value={prize} onChange={(e) => setPrize(e.target.value)}
                placeholder="ex.: 1º — Almoço pago pela equipe · 2º — Caneca personalizada · 3º — Mousepad"
                rows={3}
                className="w-full mt-2 p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-current focus:outline-none transition text-sm resize-none"
                style={{ color: palette.dark }} />
            )}
          </div>
        </div>

        <div className="p-6 pt-2 flex gap-3 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200">
            Cancelar
          </button>
          <button onClick={submit}
            className="flex-[2] py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition"
            style={{ background: palette.primary, color: palette.dark }}>
            Criar liga
          </button>
        </div>
      </div>
    </div>);

}

// ── RULES MODAL ──────────────────────────────────────────────
function RulesModal({ palette, leagueName, onAccept, onClose, scoringBreakdown, showInvite = false }) {
  const [step, setStep] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const inviteLink = `bolaocopa.app/i/${(leagueName || 'liga').toLowerCase().replace(/\s+/g, '-').slice(0, 24)}`;
  const copyInvite = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const baseSteps = [
  {
    icon: 'sparkles',
    title: `Bem-vindo ao ${leagueName}!`,
    kicker: 'Como funciona',
    body: 'É simples: você palpita placares dos jogos da Copa e ganha pontos por acertos. No final, quem tem mais pontos leva a glória (e talvez um prêmio 👀).'
  },
  {
    icon: 'clock',
    title: 'Atenção aos horários',
    kicker: 'Regras de tempo',
    body: 'Palpites de Campeão e Vice fecham 1h antes do primeiro jogo da Copa. Cada palpite de partida fecha 1h antes do apito inicial daquele jogo. Depois disso, não tem mais como mexer.'
  },
  {
    icon: 'target',
    title: 'Quanto vale cada acerto',
    kicker: 'Pontuação',
    body: null // renderizado abaixo
  }];

  const inviteStep = {
    icon: 'share',
    title: 'Chama a galera pra jogar',
    kicker: 'Convide agora',
    body: null // renderizado abaixo
  };

  const steps = showInvite ? [...baseSteps, inviteStep] : baseSteps;
  const lastStep = steps.length - 1;
  const inviteStepIndex = showInvite ? steps.length - 1 : -1;

  const s = steps[step];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
    style={{ background: `${palette.dark}e6` }}>
      <div className="bg-white rounded-[40px] shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header com progresso */}
        <div className="relative pt-10 px-8 pb-8 text-white overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${palette.dark} 0%, ${palette.secondary} 100%)` }}>
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: palette.primary }}></div>
          {onClose &&
          <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <Icon name="x" size={16} />
            </button>
          }
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              {steps.map((_, i) =>
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8' : 'w-3'}`}
              style={{ background: i <= step ? palette.primary : 'rgba(255,255,255,0.2)' }}></div>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: palette.primary }}>
              <Icon name={s.icon} size={28} style={{ color: palette.dark }} strokeWidth={2.5} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{s.kicker}</div>
            <h2 className="text-2xl font-black leading-tight mt-1">{s.title}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {s.body && <p className="text-slate-600 leading-relaxed">{s.body}</p>}
          {step === 2 &&
          <div className="space-y-2">
              {scoringBreakdown.slice(0, 5).map((rule, i) =>
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: i < 2 ? palette.primary : palette.secondary, color: i < 2 ? palette.dark : 'white' }}>
                    <Icon name={rule.icon} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: palette.dark }}>{rule.label}</div>
                    {rule.desc && <div className="text-[11px] text-slate-500">{rule.desc}</div>}
                  </div>
                  <div className="font-black text-lg" style={{ color: palette.secondary }}>
                    {typeof rule.points === 'number' ? `+${rule.points}` : rule.points}
                  </div>
                </div>
            )}
              <div className="mt-3 p-3 rounded-2xl text-xs flex items-center gap-2"
            style={{ background: `${palette.primary}15`, color: palette.dark }}>
                <Icon name="trending" size={14} />
                <span><b>Eliminatórias valem mais:</b> Oitavas 2x, Quartas 2.5x, Semi 3x, Final 4x.</span>
              </div>
            </div>
          }
          {step === inviteStepIndex &&
          <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Sua liga foi criada! Bolão fica mais divertido com gente — manda o link pros amigos, família ou o time todo entrarem em <b>{leagueName}</b>.
              </p>

              {/* Link copy */}
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                <Icon name="link" size={18} style={{ color: palette.secondary }} />
                <span className="flex-1 text-sm font-mono truncate" style={{ color: palette.dark }}>{inviteLink}</span>
                <button onClick={copyInvite}
                  className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition"
                  style={{ background: copied ? '#16A34A' : palette.dark, color: 'white' }}>
                  {copied ?
                    <><Icon name="check" size={12} /> Copiado</> :
                    <><Icon name="copy" size={12} /> Copiar</>}
                </button>
              </div>

              {/* Share botões */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
                  { icon: 'qrCode', label: 'QR Code', color: palette.secondary },
                  { icon: 'share', label: 'Mais', color: palette.dark }
                ].map((b, i) =>
                  <button key={i} className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ background: b.color }}>
                      <Icon name={b.icon} size={18} />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: palette.dark }}>{b.label}</span>
                  </button>
                )}
              </div>

              <div className="p-3 rounded-2xl text-xs flex items-start gap-2"
                style={{ background: `${palette.primary}15`, color: palette.dark }}>
                <Icon name="users" size={14} className="shrink-0 mt-0.5" />
                <span>Você também pode convidar depois pelo botão <b>Convidar</b> no topo da liga.</span>
              </div>
            </div>
          }
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex gap-3 border-t border-slate-100">
          {step > 0 &&
          <button onClick={() => setStep(step - 1)} className="px-6 py-4 rounded-2xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 flex items-center gap-2">
              <Icon name="chevronLeft" size={16} /> Voltar
            </button>
          }
          {step < lastStep ?
          <button onClick={() => setStep(step + 1)}
          className="flex-1 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2"
          style={{ background: palette.primary, color: palette.dark }}>
              {step === lastStep - 1 && showInvite ? 'Convidar amigos' : 'Próximo'} <Icon name="arrowRight" size={18} />
            </button> :

          <button onClick={onAccept}
          className="flex-1 py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2"
          style={{ background: palette.primary, color: palette.dark }}>
              {step === inviteStepIndex ? 'Pronto, bora jogar!' : 'Bora jogar!'} <Icon name="zap" size={18} />
            </button>
          }
        </div>
      </div>
    </div>);

}

// ── CHAMPION BET SCREEN ──────────────────────────────────────
function ChampionBetScreen({ palette, candidates, onSave, initialChampion, initialRunnerUp, device }) {
  const [champ, setChamp] = React.useState(initialChampion || '');
  const [vice, setVice] = React.useState(initialRunnerUp || '');
  const [step, setStep] = React.useState(0); // 0: campeão, 1: vice, 2: confirm
  const isMobile = device === 'mobile';

  const next = () => setStep((s) => Math.min(2, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const StepHeader = () =>
  <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {[0, 1, 2].map((i) =>
      <div key={i} className={`h-1 rounded-full transition-all ${i === step ? 'flex-1' : 'w-8'}`}
      style={{ background: i <= step ? palette.primary : '#E2E8F0' }}></div>
      )}
      </div>
    </div>;


  return (
    <div className="min-h-screen p-6 md:p-10 relative overflow-hidden"
    style={{ background: `linear-gradient(180deg, ${palette.dark} 0%, ${palette.dark}f0 100%)` }}>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl"
      style={{ background: palette.primary }}></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl"
      style={{ background: palette.secondary }}></div>

      <div className={`relative z-10 max-w-2xl mx-auto`}>
        <StepHeader />

        {/* Header */}
        <div className="text-center mb-8 text-white">
          <Icon name={step === 0 ? 'crown' : step === 1 ? 'medal' : 'sparkles'}
          size={48} className="mx-auto mb-3" style={{ color: palette.primary }} />
          <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: palette.primary }}>
            Aposta pré-Copa · Vale {step === 0 ? '+50 pts' : step === 1 ? '+25 pts' : 'muito'}
          </div>
          <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-black leading-tight`}>
            {step === 0 && 'Quem leva a taça?'}
            {step === 1 && 'E o vice-campeão?'}
            {step === 2 && 'Confirma sua aposta?'}
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            {step === 0 && 'Aposte na seleção que vai vencer a Copa do Mundo 2026.'}
            {step === 1 && 'Quem você acha que vai perder a final?'}
            {step === 2 && 'Após o início da Copa, isso não muda mais.'}
          </p>
        </div>

        {/* Cards */}
        {step < 2 &&
        <div className="bg-white rounded-[36px] p-6 shadow-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {candidates.map((t) => {
              const selected = step === 0 ? champ === t : vice === t;
              const isOther = step === 1 && champ === t;
              return (
                <button key={t}
                disabled={isOther}
                onClick={() => step === 0 ? setChamp(t) : setVice(t)}
                className={`p-3 rounded-2xl transition-all relative ${selected ? 'shadow-lg scale-[1.03]' : 'hover:scale-105'} ${isOther ? 'opacity-30' : ''}`}
                style={selected ?
                { background: palette.primary, border: `2px solid ${palette.primary}` } :
                { background: '#F6F8FA', border: '2px solid transparent' }}>
                    <Flag team={t} size={28} style={{ margin: '0 auto' }} />
                    <div className="text-xs font-black mt-2 text-center"
                  style={{ color: palette.dark }}>{t}</div>
                    {selected &&
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow"
                  style={{ color: palette.secondary }}>
                        <Icon name="check" size={12} strokeWidth={3} />
                      </div>
                  }
                    {isOther &&
                  <div className="absolute inset-0 flex items-center justify-center">
                        <Badge color={palette.dark}>Campeão</Badge>
                      </div>
                  }
                  </button>);

            })}
            </div>
          </div>
        }

        {step === 2 &&
        <div className="bg-white rounded-[36px] p-8 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-5 rounded-3xl"
            style={{ background: `${palette.primary}20`, border: `2px solid ${palette.primary}` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: palette.primary }}>
                  <Icon name="crown" size={28} style={{ color: palette.dark }} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Campeão · +50 pts</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Flag team={champ} size={28} />
                    <span className="text-xl font-black" style={{ color: palette.dark }}>{champ}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: palette.secondary }}>
                  <Icon name="medal" size={28} style={{ color: 'white' }} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vice · +25 pts</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Flag team={vice} size={28} />
                    <span className="text-xl font-black" style={{ color: palette.dark }}>{vice}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-2xl flex items-start gap-3 text-sm"
            style={{ background: '#FEF3C7', color: '#92400E' }}>
                <Icon name="clock" size={18} className="shrink-0 mt-0.5" />
                <div><b>Fecha em 21 dias</b> · após 18:00 de 11/jun/2026 (BRT), você não pode mais alterar.</div>
              </div>
            </div>
          </div>
        }

        {/* Botões */}
        <div className="mt-6 flex gap-3">
          {step > 0 &&
          <button onClick={prev}
          className="px-6 py-4 rounded-2xl font-bold flex items-center gap-2 bg-white/10 backdrop-blur text-white hover:bg-white/20">
              <Icon name="chevronLeft" size={16} /> Voltar
            </button>
          }
          {step < 2 ?
          <button onClick={next} disabled={step === 0 && !champ || step === 1 && !vice}
          className="flex-1 py-4 rounded-2xl font-black shadow-2xl hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: palette.primary, color: palette.dark }}>
              {step === 0 ? 'Escolher Vice' : 'Revisar aposta'} <Icon name="arrowRight" size={18} />
            </button> :

          <button onClick={() => onSave({ champion: champ, runnerUp: vice })}
          className="flex-1 py-4 rounded-2xl font-black shadow-2xl hover:scale-[1.02] transition flex items-center justify-center gap-2"
          style={{ background: palette.primary, color: palette.dark }}>
              <Icon name="save" size={18} /> Confirmar aposta
            </button>
          }
        </div>
      </div>
    </div>);

}

// ── INVITE MODAL ─────────────────────────────────────────────
function InviteModal({ palette, leagueName, onClose }) {
  const [copied, setCopied] = React.useState(false);
  const link = `bolaocopa.app/i/${(leagueName || 'liga').toLowerCase().replace(/\s+/g, '-').slice(0, 24)}`;
  const copy = () => {setCopied(true);setTimeout(() => setCopied(false), 2000);};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
    style={{ background: `${palette.dark}cc` }} onClick={onClose}>
      <div className="bg-white rounded-[36px] shadow-2xl max-w-md w-full overflow-hidden"
      onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-white relative"
        style={{ background: `linear-gradient(135deg, ${palette.dark}, ${palette.secondary})` }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <Icon name="x" size={16} />
          </button>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: palette.primary }}>
            <Icon name="share" size={26} style={{ color: palette.dark }} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black">Convide a galera</h2>
          <p className="text-white/70 text-sm">Quem entrar pelo link participa de <b>{leagueName}</b>.</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Link copy */}
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <Icon name="link" size={18} style={{ color: palette.secondary }} />
            <span className="flex-1 text-sm font-mono truncate" style={{ color: palette.dark }}>{link}</span>
            <button onClick={copy} className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0"
            style={{ background: copied ? '#16A34A' : palette.dark, color: 'white' }}>
              {copied ? <><Icon name="check" size={12} /> Copiado</> : <><Icon name="copy" size={12} /> Copiar</>}
            </button>
          </div>

          {/* QR Code mock */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <div className="w-24 h-24 rounded-xl bg-white p-2 flex items-center justify-center shrink-0">
              <QRPlaceholder color={palette.dark} size={80} />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: palette.dark }}>QR Code da liga</div>
              <div className="text-xs text-slate-500">Aponta a câmera pra entrar direto</div>
            </div>
          </div>

          {/* Share botões */}
          <div className="grid grid-cols-3 gap-3">
            {[
            { icon: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
            { icon: 'copy', label: 'Copiar', color: palette.secondary },
            { icon: 'share', label: 'Mais', color: palette.dark }].
            map((b, i) =>
            <button key={i} className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: b.color }}>
                  <Icon name={b.icon} size={18} />
                </div>
                <span className="text-xs font-bold" style={{ color: palette.dark }}>{b.label}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>);

}

// QR Placeholder — desenha grid de pixels pseudo-aleatório
function QRPlaceholder({ color = '#244C5A', size = 80 }) {
  const grid = 13;
  // padrão pseudo-aleatório determinístico
  const pattern = React.useMemo(() => {
    const arr = [];
    let seed = 42;
    for (let y = 0; y < grid; y++) {
      const row = [];
      for (let x = 0; x < grid; x++) {
        seed = (seed * 9301 + 49297) % 233280;
        row.push(seed / 233280 > 0.45);
      }
      arr.push(row);
    }
    // forçar os 3 cantos como markers (3x3 quadrado preto com 1x1 branco dentro)
    const setCorner = (sx, sy) => {
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) arr[sy + y][sx + x] = true;
      arr[sy + 1][sx + 1] = false;
    };
    setCorner(0, 0);setCorner(grid - 3, 0);setCorner(0, grid - 3);
    return arr;
  }, []);
  const px = size / grid;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pattern.map((row, y) => row.map((v, x) => v ?
      <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={color} /> :
      null))}
    </svg>);

}

Object.assign(window, {
  LoginScreen, LeaguesScreen, CreateLeagueModal, RulesModal, ChampionBetScreen, InviteModal, QRPlaceholder
});