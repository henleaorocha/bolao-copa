// ─────────────────────────────────────────────────────────────
// MATCHES — Lista de palpites (2 variantes), Tabela de Grupos,
//          Detalhe de jogo individual
// ─────────────────────────────────────────────────────────────

function MatchesScreen({ palette, matches, groups, predictions, setPrediction, onView, leagueName, variant = 'A', device, onInvite, user }) {
  const isMobile = device === 'mobile';
  const [activeGroup, setActiveGroup] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState('all'); // 'all' | 'today' | 'tomorrow'
  const [saveState, setSaveState] = React.useState('idle'); // idle | saving | saved

  const today = React.useMemo(() => {
    const d = new Date('2026-06-12T10:00');  // mock "hoje" durante a copa
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const tomorrow = React.useMemo(() => {
    const d = new Date(today); d.setDate(d.getDate() + 1); return d;
  }, [today]);

  const sameDay = (a, b) => {
    const da = new Date(a);
    return da.getFullYear() === b.getFullYear() &&
           da.getMonth() === b.getMonth() &&
           da.getDate() === b.getDate();
  };

  const filtered = matches.filter(m => {
    if (activeGroup !== 'all' && m.group !== activeGroup) return false;
    if (dateFilter === 'today' && !sameDay(m.date, today)) return false;
    if (dateFilter === 'tomorrow' && !sameDay(m.date, tomorrow)) return false;
    return true;
  });

  const countToday = matches.filter(m => sameDay(m.date, today)).length;
  const countTomorrow = matches.filter(m => sameDay(m.date, tomorrow)).length;

  const save = () => {
    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    }, 700);
  };

  return (
    <div>
      {isMobile && <MobileTopbar title="Palpites"
                                  subtitle={`${filtered.length} jogos · Grupos`}
                                  palette={palette} leagueName={leagueName} user={user} onInvite={onInvite}/>}
      {!isMobile && (
        <Topbar palette={palette} title="Palpites"
                subtitle="Chute os placares antes do início de cada jogo."
                breadcrumb={<><Icon name="calendar" size={12}/><span>Fase de grupos · {filtered.length} jogos</span></>}
                action={
                  <div className="flex items-center gap-3">
                    <button onClick={save} disabled={saveState !== 'idle'}
                      className="px-5 py-3 rounded-2xl font-black text-sm shadow-lg hover:scale-105 transition flex items-center gap-2 disabled:opacity-60"
                      style={{ background: palette.primary, color: palette.dark }}>
                      <Icon name={saveState === 'saved' ? 'check' : 'save'} size={16}/>
                      {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Palpites salvos!' : 'Salvar todos'}
                    </button>
                  </div>
                }/>
      )}

      <div className={isMobile ? 'px-5' : ''}>
        {/* Filtros de data — Todos / Hoje / Amanhã */}
        <div className="mb-4 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 w-fit">
          {[
            { id: 'all', label: 'Todos', icon: 'calendar', count: matches.length },
            { id: 'today', label: 'Hoje', icon: 'fire', count: countToday },
            { id: 'tomorrow', label: 'Amanhã', icon: 'clock', count: countTomorrow },
          ].map(f => (
            <button key={f.id} onClick={() => setDateFilter(f.id)}
              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition ${dateFilter === f.id ? 'bg-white shadow' : 'text-slate-500'}`}
              style={dateFilter === f.id ? { color: palette.secondary } : {}}>
              <Icon name={f.icon} size={14}/> {f.label}
              {f.count > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                  style={{ background: dateFilter === f.id ? palette.secondary : '#E2E8F0', color: dateFilter === f.id ? 'white' : '#64748b' }}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filtro de grupos */}
        <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setActiveGroup('all')}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition ${activeGroup === 'all' ? 'shadow' : 'text-slate-500'}`}
            style={activeGroup === 'all' ? { background: palette.dark, color: 'white' } : { background: 'white', border: '1px solid #E2E8F0' }}>
            Todos
          </button>
          {groups.map(g => (
            <button key={g.name} onClick={() => setActiveGroup(g.name)}
              className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition`}
              style={activeGroup === g.name
                ? { background: palette.dark, color: 'white' }
                : { background: 'white', color: '#64748b', border: '1px solid #E2E8F0' }}>
              Grupo {g.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-[28px] p-12 border border-slate-100 text-center">
            <Icon name="calendar" size={36} className="mx-auto mb-3 opacity-30"/>
            <div className="text-sm font-bold text-slate-500">Nenhum jogo neste filtro</div>
            <div className="text-xs text-slate-400 mt-1">Troque para outro filtro ou volte mais tarde</div>
          </div>
        ) : variant === 'A' ? (
          <MatchesVariantA palette={palette} matches={filtered} predictions={predictions} setPrediction={setPrediction} onView={onView}/>
        ) : (
          <MatchesVariantB palette={palette} matches={filtered} predictions={predictions} setPrediction={setPrediction} onView={onView}/>
        )}

        {/* Sticky save bar on mobile */}
        {isMobile && (
          <div className="fixed bottom-20 left-4 right-4 z-20">
            <button onClick={save}
              className="w-full py-4 rounded-2xl font-black text-sm shadow-2xl flex items-center justify-center gap-2"
              style={{ background: palette.primary, color: palette.dark }}>
              <Icon name={saveState === 'saved' ? 'check' : 'save'} size={16}/>
              {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Salvo!' : 'Salvar palpites'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── VARIANT A — Cards expandidos por jogo ────────────────────
function MatchesVariantA({ palette, matches, predictions, setPrediction, onView }) {
  // agrupar por dia
  const groups = matches.reduce((acc, m) => {
    const key = new Date(m.date).toDateString();
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});
  const days = Object.keys(groups);

  return (
    <div className="space-y-8">
      {days.slice(0, 8).map(day => (
        <div key={day}>
          {/* Day header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-black uppercase tracking-widest" style={{ color: palette.dark }}>
              {formatDayHeader(day)}
            </div>
            <div className="flex-1 h-px bg-slate-200"></div>
            <div className="text-[10px] text-slate-400 font-bold">{groups[day].length} jogo{groups[day].length > 1 ? 's' : ''}</div>
          </div>
          <div className="space-y-3">
            {groups[day].map(m => (
              <MatchPredictionCard key={m.id} palette={palette} match={m}
                                   prediction={predictions[m.id]}
                                   setPrediction={(p) => setPrediction(m.id, p)}
                                   onView={onView}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── VARIANT B — Lista compacta densa ─────────────────────────
function MatchesVariantB({ palette, matches, predictions, setPrediction, onView }) {
  return (
    <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-50">
        {matches.map(m => {
          const p = predictions[m.id] || {};
          const locked = m.locked;
          const filled = p.a !== undefined && p.b !== undefined && p.a !== '' && p.b !== '';
          return (
            <div key={m.id}
                 className="px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition cursor-pointer"
                 onClick={() => onView('match-detail', m)}>
              {/* Date col */}
              <div className="w-12 shrink-0 text-center">
                <div className="text-xs font-black" style={{ color: palette.dark }}>{formatDate(m.date, 'day')}</div>
                <div className="text-[10px] text-slate-400">{formatDate(m.date, 'time')}</div>
              </div>

              {/* Group */}
              <div className="w-8 shrink-0 text-center">
                <div className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Grp</div>
                <div className="text-xs font-black" style={{ color: palette.dark }}>{m.group}</div>
              </div>

              {/* Teams */}
              <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                <span className="text-sm font-bold truncate" style={{ color: palette.dark }}>{m.teamA}</span>
                <Flag team={m.teamA} size={22}/>
              </div>

              {/* Score inputs */}
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1.5 shrink-0"
                   onClick={(e) => e.stopPropagation()}>
                <input type="number" min="0" max="20" placeholder="-"
                  value={p.a ?? ''} disabled={locked}
                  onChange={(e) => setPrediction(m.id, { ...p, a: e.target.value })}
                  className="w-9 h-9 text-center text-base font-black bg-white rounded-lg outline-none border-2 border-transparent focus:border-current disabled:bg-slate-100"
                  style={{ color: palette.dark, borderColor: filled ? palette.secondary : 'transparent' }}/>
                <span className="text-slate-300 text-xs font-black">×</span>
                <input type="number" min="0" max="20" placeholder="-"
                  value={p.b ?? ''} disabled={locked}
                  onChange={(e) => setPrediction(m.id, { ...p, b: e.target.value })}
                  className="w-9 h-9 text-center text-base font-black bg-white rounded-lg outline-none border-2 border-transparent focus:border-current disabled:bg-slate-100"
                  style={{ color: palette.dark, borderColor: filled ? palette.secondary : 'transparent' }}/>
              </div>

              {/* Teams right */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Flag team={m.teamB} size={22}/>
                <span className="text-sm font-bold truncate" style={{ color: palette.dark }}>{m.teamB}</span>
              </div>

              {/* Status */}
              <div className="w-20 shrink-0 text-right">
                {locked
                  ? <Badge color="#94a3b8">Fechado</Badge>
                  : filled
                    ? <Badge color="#16A34A" tone="solid">Salvo</Badge>
                    : <Badge color={palette.secondary}>Aberto</Badge>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MATCH PREDICTION CARD (variant A) ────────────────────────
function MatchPredictionCard({ palette, match, prediction, setPrediction, onView }) {
  const p = prediction || {};
  const filled = p.a !== undefined && p.b !== undefined && p.a !== '' && p.b !== '';
  const locked = match.locked;
  return (
    <div className={`rounded-[24px] p-5 border transition-all ${locked ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}>
      {/* Top row: meta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GroupBadge groupName={match.group} color={palette.dark}/>
          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Icon name="clock" size={11}/>
            {formatDate(match.date, 'long')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {locked
            ? <Badge color="#94a3b8"><Icon name="lock" size={10} style={{display:'inline-block', marginRight: 4, verticalAlign:-1}}/> Fechado</Badge>
            : filled
              ? <Badge color="#16A34A" tone="solid"><Icon name="check" size={10} style={{display:'inline-block', marginRight:4, verticalAlign:-1}}/> Palpitado</Badge>
              : <Badge color={palette.secondary}>Aberto</Badge>}
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Flag team={match.teamA} size={36}/>
          <div className="min-w-0">
            <div className="font-black text-lg leading-tight truncate" style={{ color: palette.dark }}>{match.teamA}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{(window.TEAM_CODES || {})[match.teamA]}</div>
          </div>
        </div>

        {/* Inputs */}
        <div className="flex items-center gap-2 shrink-0">
          <input type="number" min="0" max="20" placeholder="-"
            value={p.a ?? ''} disabled={locked}
            onChange={(e) => setPrediction({ ...p, a: e.target.value })}
            className="w-14 h-14 text-center text-2xl font-black bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-current disabled:bg-slate-100 transition"
            style={{ color: palette.dark, borderColor: filled ? palette.secondary : 'transparent' }}/>
          <span className="text-slate-300 text-xl font-black">×</span>
          <input type="number" min="0" max="20" placeholder="-"
            value={p.b ?? ''} disabled={locked}
            onChange={(e) => setPrediction({ ...p, b: e.target.value })}
            className="w-14 h-14 text-center text-2xl font-black bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-current disabled:bg-slate-100 transition"
            style={{ color: palette.dark, borderColor: filled ? palette.secondary : 'transparent' }}/>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
          <div className="min-w-0 text-right">
            <div className="font-black text-lg leading-tight truncate" style={{ color: palette.dark }}>{match.teamB}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{(window.TEAM_CODES || {})[match.teamB]}</div>
          </div>
          <Flag team={match.teamB} size={36}/>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
          <Icon name="target" size={11}/>
          <span>Placar exato: +10 pts · Vencedor/empate: +5 pts</span>
        </div>
        <button onClick={() => onView('match-detail', match)}
                className="text-xs font-bold flex items-center gap-1" style={{ color: palette.secondary }}>
          Detalhes <Icon name="arrowRight" size={11}/>
        </button>
      </div>
    </div>
  );
}

// ── TABLE SCREEN (seleções / standings em menu próprio) ────
function TableScreen({ palette, groups, leagueName, device, onInvite, user }) {
  const isMobile = device === 'mobile';
  return (
    <div>
      {isMobile && <MobileTopbar title="Tabela"
                                  subtitle="Classificação atual dos 12 grupos"
                                  palette={palette} leagueName={leagueName} user={user} onInvite={onInvite}/>}
      {!isMobile && (
        <Topbar palette={palette} title="Tabela da Copa"
                subtitle="Classificação oficial — 12 grupos, 48 seleções"
                breadcrumb={<><Icon name="list" size={12}/><span>Fase de grupos</span></>}/>
      )}
      <div className={isMobile ? 'px-5' : ''}>
        <GroupsTable palette={palette} groups={groups}/>
      </div>
    </div>
  );
}

// ── GROUPS TABLE ─────────────────────────────────────────────
function GroupsTable({ palette, groups }) {
  return (
    <div className={`grid gap-4 ${'md:grid-cols-2 lg:grid-cols-3'}`}>
      {groups.map(g => (
        <div key={g.name} className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between"
               style={{ background: palette.dark, color: 'white' }}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Grupo</span>
              <span className="text-lg font-black">{g.name}</span>
            </div>
            <Badge color={palette.primary} tone="soft" size="sm">{g.teams.length} seleções</Badge>
          </div>
          <div>
            <div className="grid grid-cols-[1fr_36px_36px_36px_36px] px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <div>Seleção</div>
              <div className="text-center">PTS</div>
              <div className="text-center">J</div>
              <div className="text-center">SG</div>
              <div className="text-center">GP</div>
            </div>
            {g.teams.map((t, idx) => (
              <div key={t} className="grid grid-cols-[1fr_36px_36px_36px_36px] px-4 py-3 items-center hover:bg-slate-50 transition border-b border-slate-50 last:border-b-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ background: idx < 2 ? `${palette.secondary}20` : '#F1F5F9', color: idx < 2 ? palette.secondary : '#94a3b8' }}>
                    {idx + 1}
                  </span>
                  <Flag team={t} size={16}/>
                  <span className="font-bold text-sm truncate" style={{ color: palette.dark }}>{t}</span>
                </div>
                <div className="text-center text-sm font-black" style={{ color: palette.secondary }}>0</div>
                <div className="text-center text-xs text-slate-400">0</div>
                <div className="text-center text-xs text-slate-400">0</div>
                <div className="text-center text-xs text-slate-400">0</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MATCH DETAIL SCREEN ──────────────────────────────────────
function MatchDetailScreen({ palette, match, prediction, setPrediction, onBack, leagueName, device, onInvite, user }) {
  const isMobile = device === 'mobile';
  const p = prediction || {};
  const filled = p.a !== undefined && p.b !== undefined && p.a !== '' && p.b !== '';
  const [saved, setSaved] = React.useState(false);

  if (!match) return <div className="p-10">Jogo não encontrado.</div>;

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack}
        className={`${isMobile ? 'mx-5 mt-5' : ''} flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 mb-4`}>
        <Icon name="chevronLeft" size={16}/> Voltar
      </button>

      <div className={isMobile ? 'px-5 space-y-5' : 'space-y-5'}>
        {/* Hero card */}
        <div className="rounded-[32px] overflow-hidden shadow-xl"
             style={{ background: `linear-gradient(135deg, ${palette.dark}, ${palette.secondary})`, color: 'white' }}>
          <div className="p-6 md:p-8 relative">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10 blur-3xl"
                 style={{ background: palette.primary }}></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <GroupBadge groupName={match.group} color={palette.primary}/>
                <Badge color="white">{match.phase}</Badge>
              </div>
              <Badge color={match.locked ? '#94a3b8' : palette.primary} tone="solid">
                {match.locked ? 'Fechado' : 'Palpites abertos'}
              </Badge>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8 relative z-10">
              <div className="text-center md:text-right">
                <Flag team={match.teamA} size={isMobile ? 50 : 70} style={{ margin: '0 auto' }}/>
                <div className="text-2xl md:text-3xl font-black mt-3 leading-tight">{match.teamA}</div>
                <div className="text-xs opacity-60 uppercase tracking-widest font-bold mt-1">{(window.TEAM_CODES || {})[match.teamA]}</div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Seu palpite</div>
                <div className="flex items-center gap-2 bg-white rounded-2xl p-2">
                  <input type="number" min="0" max="20" placeholder="-"
                    value={p.a ?? ''} disabled={match.locked}
                    onChange={(e) => setPrediction({ ...p, a: e.target.value })}
                    className="w-14 h-14 md:w-16 md:h-16 text-center text-3xl font-black bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-current disabled:bg-slate-100"
                    style={{ color: palette.dark, borderColor: filled ? palette.secondary : 'transparent' }}/>
                  <span className="text-slate-300 font-black text-xl">×</span>
                  <input type="number" min="0" max="20" placeholder="-"
                    value={p.b ?? ''} disabled={match.locked}
                    onChange={(e) => setPrediction({ ...p, b: e.target.value })}
                    className="w-14 h-14 md:w-16 md:h-16 text-center text-3xl font-black bg-slate-50 rounded-xl outline-none border-2 border-transparent focus:border-current disabled:bg-slate-100"
                    style={{ color: palette.dark, borderColor: filled ? palette.secondary : 'transparent' }}/>
                </div>
                {filled && (
                  <button onClick={save}
                    className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg hover:scale-105 transition"
                    style={{ background: palette.primary, color: palette.dark }}>
                    {saved ? <><Icon name="check" size={12}/> Salvo!</> : <><Icon name="save" size={12}/> Salvar palpite</>}
                  </button>
                )}
              </div>

              <div className="text-center md:text-left">
                <Flag team={match.teamB} size={isMobile ? 50 : 70} style={{ margin: '0 auto' }}/>
                <div className="text-2xl md:text-3xl font-black mt-3 leading-tight">{match.teamB}</div>
                <div className="text-xs opacity-60 uppercase tracking-widest font-bold mt-1">{(window.TEAM_CODES || {})[match.teamB]}</div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between flex-wrap gap-3 text-xs opacity-80">
              <div className="flex items-center gap-2"><Icon name="calendar" size={14}/> {formatDate(match.date, 'long')}</div>
              <div className="flex items-center gap-2"><Icon name="shield" size={14}/> {match.stadium}</div>
              <div className="flex items-center gap-2"><Icon name="clock" size={14}/> Fecha 1h antes do início</div>
            </div>
          </div>
        </div>

        {/* Confronto e info de pontuação */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${palette.primary}25` }}>
                <Icon name="zap" size={18} style={{ color: palette.dark }}/>
              </div>
              <h3 className="text-base font-black" style={{ color: palette.dark }}>Quanto vale acertar</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
                <span style={{ color: palette.dark }}>Placar exato</span>
                <span className="font-black" style={{ color: palette.secondary }}>+10 pts</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
                <span style={{ color: palette.dark }}>Apenas vencedor/empate</span>
                <span className="font-black" style={{ color: palette.secondary }}>+5 pts</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl"
                   style={{ background: `${palette.primary}15` }}>
                <span style={{ color: palette.dark }}>Multiplicador da fase</span>
                <span className="font-black" style={{ color: palette.dark }}>1x</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${palette.secondary}25` }}>
                <Icon name="users" size={18} style={{ color: palette.secondary }}/>
              </div>
              <h3 className="text-base font-black" style={{ color: palette.dark }}>Palpites da liga</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Vitória <b style={{ color: palette.dark }}>{match.teamA}</b></span>
                <span>62%</span>
              </div>
              <BarTriple a={62} d={20} b={18} palette={palette}/>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Empate</span><span>20%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Vitória <b style={{ color: palette.dark }}>{match.teamB}</b></span><span>18%</span>
              </div>
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                <Icon name="eye" size={11}/> Visto após você palpitar
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// helper: barra empilhada triplo
function BarTriple({ a, d, b, palette }) {
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
      <div style={{ width: `${a}%`, background: palette.secondary }}></div>
      <div style={{ width: `${d}%`, background: palette.primary }}></div>
      <div style={{ width: `${b}%`, background: palette.dark }}></div>
    </div>
  );
}

function formatDayHeader(dStr) {
  const d = new Date(dStr);
  const wd = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()];
  const day = d.getDate();
  const month = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getMonth()];
  return `${wd} · ${day} de ${month}`;
}

Object.assign(window, {
  MatchesScreen, MatchesVariantA, MatchesVariantB, MatchPredictionCard,
  GroupsTable, TableScreen, MatchDetailScreen, BarTriple, formatDayHeader,
});
