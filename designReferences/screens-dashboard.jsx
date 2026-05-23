// ─────────────────────────────────────────────────────────────
// DASHBOARD — 3 variantes (A: Stats Grid, B: Hero Match, C: Timeline)
// ─────────────────────────────────────────────────────────────

function DashboardScreen({ palette, leagueName, user, matches, ranking, championBet, variant = 'A', device, onView, onInvite }) {
  const isMobile = device === 'mobile';
  const upcoming = matches.slice(0, 5);
  const firstMatch = matches[0];
  const daysToStart = 21;
  const myRank = ranking.find(r => r.isMe) || { rank: '—', points: 0 };

  return (
    <div className={isMobile ? '' : ''}>
      {isMobile && <MobileTopbar title={`Olá, ${user.name?.split(' ')[0]}!`}
                                  subtitle="Bora pra mais uma rodada de palpites?"
                                  palette={palette} leagueName={leagueName} user={user} onInvite={onInvite}/>}
      {!isMobile && (
        <Topbar palette={palette} title={`Olá, ${user.name?.split(' ')[0]}! 👋`}
                subtitle="Bora pra mais uma rodada de palpites?"
                breadcrumb={<><Icon name="trophy" size={12}/><span>{leagueName}</span></>}
                user={user}/>
      )}

      <div className={`${isMobile ? 'px-5' : ''} space-y-6`}>
        {/* COUNTDOWN BANNER */}
        <CountdownBanner palette={palette} days={daysToStart} firstMatch={firstMatch}/>

        {variant === 'A' && <DashboardVariantA palette={palette} myRank={myRank} championBet={championBet}
                                                matches={upcoming} onView={onView} ranking={ranking} isMobile={isMobile}/>}
        {variant === 'B' && <DashboardVariantB palette={palette} myRank={myRank} championBet={championBet}
                                                matches={upcoming} onView={onView} ranking={ranking} isMobile={isMobile}/>}
        {variant === 'C' && <DashboardVariantC palette={palette} myRank={myRank} championBet={championBet}
                                                matches={upcoming} onView={onView} ranking={ranking} isMobile={isMobile}/>}
      </div>
    </div>
  );
}

// ── COUNTDOWN BANNER ─────────────────────────────────────────
function CountdownBanner({ palette, days, firstMatch }) {
  const hours = days * 24 + 6;
  return (
    <div className="rounded-[28px] p-6 relative overflow-hidden text-white"
         style={{ background: `linear-gradient(135deg, ${palette.dark} 0%, #1a3a47 100%)` }}>
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-15 blur-3xl"
           style={{ background: palette.primary }}></div>
      {/* Numerais decorativos */}
      <div className="absolute -bottom-10 -right-2 font-black opacity-[0.06] select-none pointer-events-none leading-none"
           style={{ fontSize: '9rem', color: palette.primary }}>{days}</div>

      <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2 flex items-center gap-2"
               style={{ color: palette.primary }}>
            <Icon name="fire" size={12}/> Atenção · Palpite de campeão fecha em
          </div>
          <div className="flex items-end gap-2">
            <div className="text-5xl font-black leading-none">{days}</div>
            <div className="text-sm opacity-70 mb-1">dias · {hours % 24}h</div>
          </div>
          <div className="text-xs opacity-60 mt-2 flex items-center gap-1.5">
            <Icon name="calendar" size={12}/>
            {firstMatch && `${firstMatch.teamA} × ${firstMatch.teamB} · ${formatDate(firstMatch.date, 'short')}`}
          </div>
        </div>
        <button className="px-5 py-3 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition flex items-center gap-2"
                style={{ background: palette.primary, color: palette.dark }}>
          <Icon name="crown" size={16}/> Apostar Campeão
        </button>
      </div>
    </div>
  );
}

// ── VARIANT A — STATS GRID + LISTA ───────────────────────────
function DashboardVariantA({ palette, myRank, championBet, matches, onView, ranking, isMobile }) {
  return (
    <>
      {/* Stats grid */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <StatCard label="Sua posição" value={`${myRank.rank}º`} sub="de 87"
                  icon="podium" palette={palette} accent={palette.secondary}/>
        <StatCard label="Pontos" value={myRank.points} sub="acumulados"
                  icon="zap" palette={palette} accent={palette.primary} highlight/>
        <StatCard label="Palpites" value="0/72" sub="fase de grupos"
                  icon="target" palette={palette} accent={palette.dark}/>
        <StatCard label="Acertos exatos" value={myRank.exactMatches || 0} sub="placar cravado"
                  icon="checkCircle" palette={palette} accent="#16A34A"/>
      </div>

      {/* Lower row: Campeão + Próximos */}
      <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        <div className={isMobile ? '' : 'col-span-1'}>
          <ChampionPickCard palette={palette} championBet={championBet} onView={onView}/>
        </div>
        <div className={isMobile ? '' : 'col-span-2'}>
          <UpcomingMatchesCard palette={palette} matches={matches} onView={onView}/>
        </div>
      </div>

      {/* Top 5 + Convite */}
      <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <MiniRankingCard palette={palette} ranking={ranking} onView={onView}/>
        <ScoringHintCard palette={palette}/>
      </div>
    </>
  );
}

// ── VARIANT B — HERO MATCH (primeiro jogo em destaque) ───────
function DashboardVariantB({ palette, myRank, championBet, matches, onView, ranking, isMobile }) {
  const next = matches[0];
  return (
    <>
      {/* HERO próximo jogo */}
      <div className="rounded-[28px] overflow-hidden shadow-xl"
           style={{ background: `linear-gradient(135deg, ${palette.secondary} 0%, ${palette.dark} 100%)` }}>
        <div className="p-6 md:p-8 text-white relative">
          <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full opacity-10 blur-3xl"
               style={{ background: palette.primary }}></div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70 mb-1">Próximo jogo · Aberto</div>
              <div className="text-xs opacity-80">{formatDate(next?.date, 'long')} · {next?.stadium}</div>
            </div>
            <Badge color={palette.primary} tone="solid">Grupo {next?.group}</Badge>
          </div>

          {/* Teams */}
          <div className={`flex items-center justify-center gap-6 ${isMobile ? 'py-2' : 'py-4'}`}>
            <TeamColumn team={next?.teamA} palette={palette} size={isMobile ? 'lg' : 'xl'}/>
            <div className="flex flex-col items-center gap-2">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Seu palpite</div>
              <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2">
                <input className="w-10 h-10 text-2xl font-black text-center bg-slate-50 rounded-xl outline-none"
                       style={{ color: palette.dark }} placeholder="-"/>
                <span className="font-black text-slate-300">×</span>
                <input className="w-10 h-10 text-2xl font-black text-center bg-slate-50 rounded-xl outline-none"
                       style={{ color: palette.dark }} placeholder="-"/>
              </div>
              <button className="text-[10px] font-bold uppercase tracking-widest mt-1"
                      style={{ color: palette.primary }}>Salvar palpite →</button>
            </div>
            <TeamColumn team={next?.teamB} palette={palette} size={isMobile ? 'lg' : 'xl'}/>
          </div>
        </div>
      </div>

      {/* Sub stats */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <StatCard label="Posição" value={`${myRank.rank}º`} sub="de 87" icon="podium" palette={palette} accent={palette.secondary}/>
        <StatCard label="Pontos" value={myRank.points} sub="acumulados" icon="zap" palette={palette} accent={palette.primary} highlight/>
        <StatCard label="Faltam" value="72" sub="palpites" icon="target" palette={palette} accent={palette.dark}/>
        <StatCard label="Liga" value="87" sub="jogadores" icon="users" palette={palette} accent="#7E4FE3"/>
      </div>

      {/* Campeão + Próximos compactos */}
      <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <ChampionPickCard palette={palette} championBet={championBet} onView={onView}/>
        <MiniRankingCard palette={palette} ranking={ranking} onView={onView} compact/>
      </div>
    </>
  );
}

// ── VARIANT C — TIMELINE FOCADO ──────────────────────────────
function DashboardVariantC({ palette, myRank, championBet, matches, onView, ranking, isMobile }) {
  return (
    <>
      {/* Row de stats compactas em pílulas */}
      <div className="rounded-[28px] bg-white p-6 border border-slate-100 shadow-sm">
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-3' : 'grid-cols-5'}`}>
          <PillStat label="Posição" value={`${myRank.rank}º`} accent={palette.secondary}/>
          <PillStat label="Pontos" value={myRank.points} accent={palette.primary} bold/>
          <PillStat label="Acertos" value="0/0" accent="#16A34A"/>
          <PillStat label="Exatos" value={myRank.exactMatches || 0} accent="#7E4FE3"/>
          <PillStat label="Restam" value="72" accent={palette.dark}/>
        </div>
      </div>

      {/* Timeline jogos verticais */}
      <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black" style={{ color: palette.dark }}>Próximos 5 jogos</h2>
            <p className="text-xs text-slate-500">Palpite agora antes que feche</p>
          </div>
          <button onClick={() => onView('matches')} className="text-xs font-bold flex items-center gap-1" style={{ color: palette.secondary }}>
            Ver todos <Icon name="arrowRight" size={12}/>
          </button>
        </div>

        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-[18px] top-2 bottom-2 w-0.5" style={{ background: '#E2E8F0' }}></div>

          {matches.map((m, i) => (
            <div key={m.id} className="flex items-center gap-4 relative mb-4 last:mb-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 z-10"
                   style={{ background: i === 0 ? palette.primary : 'white', color: palette.dark, border: `2px solid ${i === 0 ? palette.primary : '#E2E8F0'}` }}>
                {i + 1}
              </div>
              <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition"
                   onClick={() => onView('match-detail', m)}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Flag team={m.teamA} size={20}/>
                  <span className="font-bold text-sm truncate" style={{ color: palette.dark }}>{m.teamA}</span>
                  <span className="text-slate-300 text-xs">×</span>
                  <span className="font-bold text-sm truncate" style={{ color: palette.dark }}>{m.teamB}</span>
                  <Flag team={m.teamB} size={20}/>
                </div>
                <div className="text-[10px] text-slate-500 text-right shrink-0">
                  <div className="font-bold">{formatDate(m.date, 'day')}</div>
                  <div>{formatDate(m.date, 'time')}</div>
                </div>
                <Badge color={palette.dark} size="sm">Grp {m.group}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Champion + Ranking */}
      <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <ChampionPickCard palette={palette} championBet={championBet} onView={onView}/>
        <MiniRankingCard palette={palette} ranking={ranking} onView={onView} compact/>
      </div>
    </>
  );
}

// ── STAT CARD ────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, palette, accent = '#0097A9', highlight = false }) {
  return (
    <div className={`rounded-[24px] p-5 relative overflow-hidden border ${highlight ? 'shadow-lg' : 'shadow-sm'}`}
         style={{ background: highlight ? palette.dark : 'white', borderColor: highlight ? 'transparent' : '#F1F5F9', color: highlight ? 'white' : palette.dark }}>
      <Icon name={icon} size={64} style={{ position: 'absolute', right: -10, bottom: -10, opacity: highlight ? 0.1 : 0.05, color: highlight ? 'white' : accent }}/>
      <div className="relative z-10">
        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: highlight ? 'rgba(255,255,255,0.6)' : '#94a3b8' }}>{label}</div>
        <div className="text-4xl font-black leading-none mb-1" style={{ color: highlight ? palette.primary : accent }}>{value}</div>
        <div className="text-xs" style={{ color: highlight ? 'rgba(255,255,255,0.7)' : '#64748b' }}>{sub}</div>
      </div>
    </div>
  );
}

function PillStat({ label, value, accent, bold = false }) {
  return (
    <div className="text-center">
      <div className={`text-2xl ${bold ? 'font-black' : 'font-black'}`} style={{ color: accent }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{label}</div>
    </div>
  );
}

// ── CHAMPION PICK CARD ───────────────────────────────────────
function ChampionPickCard({ palette, championBet, onView }) {
  const hasBet = championBet?.champion && championBet?.runnerUp;
  return (
    <div className="rounded-[28px] p-6 border border-slate-100 shadow-sm bg-white relative overflow-hidden h-full">
      <div className="absolute top-3 right-3">
        <Badge color={palette.primary} tone="soft">+50 pts</Badge>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: palette.primary }}>
          <Icon name="crown" size={20} style={{ color: palette.dark }} strokeWidth={2.5}/>
        </div>
        <div>
          <h3 className="text-base font-black" style={{ color: palette.dark }}>Sua aposta</h3>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Campeão & Vice</div>
        </div>
      </div>

      {hasBet ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: `${palette.primary}15` }}>
            <Flag team={championBet.champion} size={26}/>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Campeão</div>
              <div className="text-sm font-black" style={{ color: palette.dark }}>{championBet.champion}</div>
            </div>
            <Icon name="crown" size={18} style={{ color: palette.primary }}/>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
            <Flag team={championBet.runnerUp} size={26}/>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vice</div>
              <div className="text-sm font-black" style={{ color: palette.dark }}>{championBet.runnerUp}</div>
            </div>
            <Icon name="medal" size={18} style={{ color: palette.secondary }}/>
          </div>
          <button className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50">
            Alterar aposta · 21 dias restantes
          </button>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <div className="text-sm text-slate-600 leading-relaxed">Você ainda não apostou no Campeão e Vice. Vale muitos pontos!</div>
          <button onClick={() => onView('champion-bet')}
            className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
            style={{ background: palette.primary, color: palette.dark }}>
            Fazer aposta agora <Icon name="arrowRight" size={14}/>
          </button>
        </div>
      )}
    </div>
  );
}

// ── UPCOMING MATCHES CARD ────────────────────────────────────
function UpcomingMatchesCard({ palette, matches, onView }) {
  return (
    <div className="rounded-[28px] p-6 border border-slate-100 shadow-sm bg-white h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-black" style={{ color: palette.dark }}>Próximos jogos</h3>
          <p className="text-xs text-slate-500">Palpite antes do prazo</p>
        </div>
        <button onClick={() => onView('matches')}
                className="text-xs font-bold flex items-center gap-1" style={{ color: palette.secondary }}>
          Ver todos <Icon name="arrowRight" size={12}/>
        </button>
      </div>
      <div className="space-y-2">
        {matches.slice(0, 4).map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-white hover:shadow cursor-pointer transition border border-transparent hover:border-slate-200"
               onClick={() => onView('match-detail', m)}>
            <div className="text-center w-12 shrink-0">
              <div className="text-xs font-black" style={{ color: palette.dark }}>{formatDate(m.date, 'day')}</div>
              <div className="text-[10px] text-slate-400">{formatDate(m.date, 'time')}</div>
            </div>
            <div className="flex-1 flex items-center justify-center gap-3">
              <span className="text-sm font-bold truncate" style={{ color: palette.dark }}>{m.teamA}</span>
              <Flag team={m.teamA} size={20}/>
              <span className="text-[10px] font-black text-slate-400">VS</span>
              <Flag team={m.teamB} size={20}/>
              <span className="text-sm font-bold truncate" style={{ color: palette.dark }}>{m.teamB}</span>
            </div>
            <Badge color={palette.dark} size="sm">{m.group}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MINI RANKING CARD ────────────────────────────────────────
function MiniRankingCard({ palette, ranking, onView, compact = false }) {
  const top = ranking.slice(0, compact ? 5 : 5);
  return (
    <div className="rounded-[28px] p-6 border border-slate-100 shadow-sm bg-white h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-black" style={{ color: palette.dark }}>Ranking</h3>
          <p className="text-xs text-slate-500">Top 5 da liga</p>
        </div>
        <button onClick={() => onView('ranking')}
                className="text-xs font-bold flex items-center gap-1" style={{ color: palette.secondary }}>
          Ver tudo <Icon name="arrowRight" size={12}/>
        </button>
      </div>
      <div className="space-y-2">
        {top.map(p => (
          <div key={p.rank} className="flex items-center gap-3 p-2.5 rounded-xl"
               style={{ background: p.isMe ? `${palette.primary}20` : 'transparent' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                 style={{
                   background: p.rank === 1 ? palette.primary :
                               p.rank === 2 ? '#CBD5E1' :
                               p.rank === 3 ? '#FB923C' : '#F1F5F9',
                   color: p.rank <= 3 ? 'white' : '#64748b'
                 }}>{p.rank}</div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                 style={{ background: p.color }}>{p.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: palette.dark }}>{p.name}{p.isMe && <span className="text-[10px] ml-1 font-bold" style={{ color: palette.secondary }}>· você</span>}</div>
            </div>
            <div className="text-sm font-black" style={{ color: palette.secondary }}>{p.points}<span className="text-[10px] text-slate-400 ml-0.5">pts</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SCORING HINT CARD ────────────────────────────────────────
function ScoringHintCard({ palette }) {
  return (
    <div className="rounded-[28px] p-6 border shadow-sm relative overflow-hidden"
         style={{ background: `linear-gradient(135deg, ${palette.primary} 0%, #FFB800 100%)`, borderColor: 'transparent' }}>
      <Icon name="zap" size={120} style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, color: palette.dark }}/>
      <div className="relative z-10">
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: palette.dark, opacity: 0.7 }}>Esquema de pontos</div>
        <h3 className="text-xl font-black mb-3" style={{ color: palette.dark }}>Vale a pena cravar o placar exato</h3>
        <div className="space-y-1.5 text-xs" style={{ color: palette.dark }}>
          <div className="flex justify-between font-bold"><span>Placar exato (grupos)</span><span>+10</span></div>
          <div className="flex justify-between"><span>Vencedor/empate</span><span>+5</span></div>
          <div className="flex justify-between font-bold"><span>Campeão / Vice</span><span>+50 / +25</span></div>
          <div className="flex justify-between"><span>Multiplicador Final</span><span>4x</span></div>
        </div>
      </div>
    </div>
  );
}

// ── TEAM COLUMN — bloco vertical bandeira/nome ───────────────
function TeamColumn({ team, palette, size = 'lg', score, finalScore }) {
  const sizes = { md: { flag: 36, font: '0.875rem' }, lg: { flag: 48, font: '1rem' }, xl: { flag: 60, font: '1.25rem' } };
  const s = sizes[size];
  return (
    <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
      <Flag team={team} size={s.flag}/>
      <div className="text-center min-w-0 w-full">
        <div className="font-black truncate" style={{ fontSize: s.font, color: 'white' }}>{team}</div>
        {(window.TEAM_CODES || {})[team] && (
          <div className="text-[10px] opacity-50 font-bold uppercase tracking-widest">{(window.TEAM_CODES || {})[team]}</div>
        )}
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────
function formatDate(d, fmt = 'short') {
  if (!d) return '';
  const date = new Date(d);
  const day = date.getDate();
  const month = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][date.getMonth()];
  const wd = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (fmt === 'short') return `${day}/${date.getMonth() + 1} · ${hh}:${mm}`;
  if (fmt === 'long') return `${wd}, ${day} de ${month} · ${hh}:${mm}`;
  if (fmt === 'day') return `${day}/${month}`;
  if (fmt === 'time') return `${hh}:${mm}`;
  if (fmt === 'date') return `${day} ${month}`;
  return `${day}/${month} ${hh}:${mm}`;
}

Object.assign(window, {
  DashboardScreen, DashboardVariantA, DashboardVariantB, DashboardVariantC,
  CountdownBanner, StatCard, PillStat,
  ChampionPickCard, UpcomingMatchesCard, MiniRankingCard, ScoringHintCard,
  TeamColumn, formatDate,
});
