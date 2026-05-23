// ─────────────────────────────────────────────────────────────
// SCREENS — Bracket (mata-mata) · Ranking · Profile
// ─────────────────────────────────────────────────────────────

// ── BRACKET (mata-mata) ──────────────────────────────────────
function BracketScreen({ palette, bracketRounds, leagueName, device, onInvite, user }) {
  const isMobile = device === 'mobile';
  const [selectedRound, setSelectedRound] = React.useState('r16');
  const round = bracketRounds.find(r => r.id === selectedRound) || bracketRounds[1];

  return (
    <div>
      {isMobile && <MobileTopbar title="Mata-mata"
                                  subtitle="Quanto avança, mais vale o palpite"
                                  palette={palette} leagueName={leagueName} user={user} onInvite={onInvite}/>}
      {!isMobile && (
        <Topbar palette={palette} title="Chaveamento"
                subtitle="A partir das eliminatórias, cada palpite vale mais pontos"
                breadcrumb={<><Icon name="zap" size={12}/><span>Eliminatórias · {bracketRounds.length} fases</span></>}/>
      )}

      <div className={isMobile ? 'px-5' : ''}>
        {/* Banner aviso */}
        <div className="rounded-[24px] p-5 mb-6 flex items-center gap-4"
             style={{ background: `${palette.primary}15`, border: `1px solid ${palette.primary}40` }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
               style={{ background: palette.primary }}>
            <Icon name="clock" size={22} style={{ color: palette.dark }}/>
          </div>
          <div>
            <div className="text-sm font-black" style={{ color: palette.dark }}>Mata-mata começa em 28 de junho</div>
            <div className="text-xs text-slate-600">Os confrontos são definidos após a fase de grupos. Você poderá palpitar conforme cada fase libera.</div>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-2 overflow-x-auto mb-6 pb-2 -mx-1 px-1">
          {bracketRounds.map(r => (
            <button key={r.id} onClick={() => setSelectedRound(r.id)}
              className={`px-4 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition flex flex-col gap-0.5`}
              style={selectedRound === r.id
                ? { background: palette.dark, color: 'white' }
                : { background: 'white', color: palette.dark, border: '1px solid #E2E8F0' }}>
              <span>{r.label}</span>
              <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">{r.multiplier}x · {r.count} jogos</span>
            </button>
          ))}
        </div>

        {/* Bracket visual da rodada selecionada */}
        <BracketRoundView palette={palette} round={round} isMobile={isMobile}/>

        {/* Footer com explicação dos pontos */}
        <div className="mt-6 rounded-[24px] p-6 bg-white border border-slate-100 shadow-sm">
          <h3 className="text-base font-black mb-4" style={{ color: palette.dark }}>Multiplicadores por fase</h3>
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-6'}`}>
            {bracketRounds.map(r => (
              <div key={r.id} className="text-center p-3 rounded-2xl bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{r.label}</div>
                <div className="text-2xl font-black mt-1" style={{ color: r.id === 'final' ? palette.primary : palette.secondary }}>
                  {r.multiplier}x
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Renderiza visualização do bracket por rodada (placeholder cards)
function BracketRoundView({ palette, round, isMobile }) {
  // Confrontos de placeholder
  const slots = Array.from({ length: round.count });
  const cols = isMobile ? 1 : round.count >= 8 ? 4 : round.count >= 4 ? 4 : round.count === 2 ? 2 : 1;

  if (round.id === 'final') {
    return (
      <div className="rounded-[32px] p-8 md:p-12 text-center relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${palette.primary} 0%, #FFB800 100%)` }}>
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: `radial-gradient(${palette.dark} 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>
        <Icon name="crown" size={64} style={{ color: palette.dark, margin: '0 auto 16px' }} strokeWidth={2.5}/>
        <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-2" style={{ color: palette.dark }}>19 jul · MetLife Stadium · NY</div>
        <div className="text-4xl md:text-5xl font-black mb-4" style={{ color: palette.dark, letterSpacing: '-0.02em' }}>A Grande Final</div>
        <div className="inline-flex items-center gap-6 bg-white/30 backdrop-blur rounded-3xl p-6">
          <PlaceholderTeam label="?" palette={palette}/>
          <div className="text-3xl font-black" style={{ color: palette.dark }}>×</div>
          <PlaceholderTeam label="?" palette={palette}/>
        </div>
        <div className="mt-6 text-xs font-bold" style={{ color: palette.dark }}>
          Palpite vale <b>4x</b> · placar exato +40 / vencedor +20
        </div>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : cols === 4 ? 'grid-cols-2 lg:grid-cols-4' : `grid-cols-${cols}`}`}>
      {slots.map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-current transition cursor-pointer"
             style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{round.short} #{i + 1}</div>
            <div className="text-[10px] text-slate-400">A definir</div>
          </div>
          <div className="space-y-2">
            <BracketTeamRow label={`Vencedor ${round.id === 'r32' ? `1º Grupo ${String.fromCharCode(65 + i)}` : '— A definir —'}`} palette={palette}/>
            <div className="text-[10px] text-center text-slate-300 font-bold">vs</div>
            <BracketTeamRow label={`Vencedor ${round.id === 'r32' ? `2º Grupo ${String.fromCharCode(65 + ((i + 6) % 12))}` : '— A definir —'}`} palette={palette}/>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>{round.date}</span>
            <Badge color={palette.primary} size="sm">{round.multiplier}x</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketTeamRow({ label, palette }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
      <div className="w-6 h-4 rounded bg-slate-200 shrink-0"></div>
      <span className="text-xs text-slate-500 italic truncate flex-1">{label}</span>
    </div>
  );
}

function PlaceholderTeam({ label, palette }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
           style={{ background: 'white', color: palette.dark }}>
        {label}
      </div>
      <div className="text-xs font-black uppercase tracking-widest opacity-50" style={{ color: palette.dark }}>A definir</div>
    </div>
  );
}

// ── RANKING ──────────────────────────────────────────────────
function RankingScreen({ palette, ranking, leagueName, device, onInvite, user }) {
  const isMobile = device === 'mobile';
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);
  const myRank = ranking.find(r => r.isMe);

  return (
    <div>
      {isMobile && <MobileTopbar title="Ranking" subtitle={`${ranking.length} jogadores`}
                                  palette={palette} leagueName={leagueName} user={user} onInvite={onInvite}/>}
      {!isMobile && (
        <Topbar palette={palette} title="Ranking" subtitle={`Sua posição entre ${ranking.length} jogadores · Atualizado agora`}
                breadcrumb={<><Icon name="medal" size={12}/><span>{leagueName}</span></>}
                action={
                  <button className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-sm flex items-center gap-2 hover:bg-slate-50">
                    <Icon name="filter" size={14}/> Filtrar
                  </button>
                }/>
      )}

      <div className={isMobile ? 'px-5' : ''}>
        {/* Pódio Top 3 */}
        <Podium palette={palette} top3={top3} isMobile={isMobile}/>

        {/* Sua posição destacada */}
        {myRank && (
          <div className="rounded-[24px] p-4 mt-6 flex items-center gap-4"
               style={{ background: palette.dark, color: 'white' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg"
                 style={{ background: palette.primary, color: palette.dark }}>{myRank.rank}º</div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Sua posição</div>
              <div className="text-base font-black truncate">{myRank.name}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black" style={{ color: palette.primary }}>{myRank.points}<span className="text-xs ml-1 opacity-70">pts</span></div>
              <div className="text-[10px] opacity-60">{myRank.exactMatches} placares exatos</div>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="bg-white rounded-[24px] mt-6 border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: palette.dark }}>Classificação geral</h3>
            <div className="text-xs text-slate-400">Atualizado há 2 min</div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="px-6 py-3 text-left">#</th>
                <th className="px-2 py-3 text-left">Jogador</th>
                {!isMobile && <th className="px-3 py-3 text-center">Exatos</th>}
                {!isMobile && <th className="px-3 py-3 text-center">Acertos</th>}
                <th className="px-6 py-3 text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map(p => (
                <tr key={p.rank} className={`hover:bg-slate-50 transition border-b border-slate-50 last:border-b-0 ${p.isMe ? 'bg-yellow-50' : ''}`}
                    style={p.isMe ? { background: `${palette.primary}15` } : {}}>
                  <td className="px-6 py-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs"
                         style={{
                           background: p.rank === 1 ? palette.primary :
                                       p.rank === 2 ? '#CBD5E1' :
                                       p.rank === 3 ? '#FB923C' : '#F1F5F9',
                           color: p.rank <= 3 ? (p.rank === 1 ? palette.dark : 'white') : '#94a3b8'
                         }}>{p.rank}º</div>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                           style={{ background: p.color }}>{p.avatar}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate flex items-center gap-2" style={{ color: palette.dark }}>
                          {p.name}
                          {p.isMe && <Badge color={palette.secondary} size="sm">Você</Badge>}
                        </div>
                        {isMobile && (
                          <div className="text-[10px] text-slate-400">{p.exactMatches} exatos · {p.hits} acertos</div>
                        )}
                      </div>
                    </div>
                  </td>
                  {!isMobile && <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{p.exactMatches}</td>}
                  {!isMobile && <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{p.hits}</td>}
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-black" style={{ color: palette.secondary }}>{p.points}</span>
                    <span className="text-[10px] text-slate-400 ml-1">pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty state pretournament */}
          {ranking.every(r => r.points === 0) && (
            <div className="px-6 py-8 border-t border-slate-100 text-center">
              <Icon name="trophy" size={32} className="mx-auto mb-2 opacity-30"/>
              <div className="text-sm font-bold text-slate-500">A pontuação começa quando rolarem os jogos</div>
              <div className="text-xs text-slate-400 mt-1">O primeiro placar começa em 11 de junho ⚽</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PODIUM ───────────────────────────────────────────────────
function Podium({ palette, top3, isMobile }) {
  // Reorder for visual: 2nd, 1st, 3rd
  const ord = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = { 1: isMobile ? 100 : 140, 2: isMobile ? 70 : 100, 3: isMobile ? 50 : 70 };
  const colors = { 1: palette.primary, 2: '#CBD5E1', 3: '#FB923C' };

  return (
    <div className="rounded-[32px] p-6 md:p-8 relative overflow-hidden"
         style={{ background: `linear-gradient(180deg, ${palette.dark} 0%, #1a3a47 100%)` }}>
      <div className="absolute inset-0 opacity-[0.05]"
           style={{ backgroundImage: `linear-gradient(${palette.primary} 1px, transparent 1px), linear-gradient(90deg, ${palette.primary} 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>

      <div className="text-center mb-6 relative z-10">
        <Icon name="medal" size={28} style={{ color: palette.primary, margin: '0 auto' }}/>
        <div className="text-[10px] font-black uppercase tracking-[0.25em] mt-2" style={{ color: palette.primary }}>Pódio</div>
        <div className="text-2xl font-black text-white">Top 3 da liga</div>
      </div>

      <div className="flex items-end justify-center gap-3 md:gap-6 relative z-10">
        {ord.map((p, idx) => (
          <div key={p.rank} className="flex flex-col items-center" style={{ flex: 1, maxWidth: 160 }}>
            <div className="relative mb-2">
              {p.rank === 1 && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                  <Icon name="crown" size={24} style={{ color: palette.primary }} fill={palette.primary}/>
                </div>
              )}
              <div className={`${isMobile ? 'w-14 h-14' : 'w-20 h-20'} rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black text-white shadow-xl`}
                   style={{ background: p.color }}>{p.avatar}</div>
            </div>
            <div className="text-center mb-2 text-white">
              <div className="text-xs md:text-sm font-bold leading-tight">{p.name.split(' ')[0]}</div>
              <div className="text-xs opacity-60">{p.name.split(' ').slice(1).join(' ')}</div>
            </div>
            <div className="w-full rounded-t-2xl flex flex-col items-center justify-end pb-3 pt-2 font-black"
                 style={{ background: colors[p.rank], height: heights[p.rank], color: p.rank === 1 ? palette.dark : 'white' }}>
              <div className="text-2xl md:text-3xl leading-none">{p.rank}º</div>
              <div className="text-[10px] uppercase tracking-widest mt-1 opacity-80">{p.points} pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PROFILE ──────────────────────────────────────────────────
function ProfileScreen({ palette, user, setUser, leagueName, device, onInvite, onLogout }) {
  const isMobile = device === 'mobile';
  const avatarColors = ['#FFC72C', '#0097A9', '#244C5A', '#F46036', '#7E4FE3', '#16A34A', '#DC2626', '#EA580C', '#FB923C', '#06B6D4'];

  return (
    <div>
      {isMobile && <MobileTopbar title="Perfil" subtitle="Personalize sua presença"
                                  palette={palette} leagueName={leagueName} user={user} onInvite={onInvite}/>}
      {!isMobile && (
        <Topbar palette={palette} title="Meu perfil"
                subtitle="Personalize seu avatar e configurações"
                breadcrumb={<><Icon name="user" size={12}/><span>Configurações</span></>}/>
      )}

      <div className={isMobile ? 'px-5 space-y-5' : 'max-w-3xl space-y-5'}>
        {/* Card identidade */}
        <div className="bg-white rounded-[28px] p-6 md:p-8 border border-slate-100 shadow-sm">
          <div className={`flex items-center gap-6 ${isMobile ? 'flex-col text-center' : ''}`}>
            <div className="relative">
              <div className={`${isMobile ? 'w-24 h-24' : 'w-28 h-28'} rounded-[28px] flex items-center justify-center text-4xl font-black text-white shadow-lg`}
                   style={{ background: user.color }}>
                {user.avatar || user.name?.charAt(0)}
              </div>
              <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-slate-200 hover:scale-110 transition"
                      style={{ color: palette.secondary }}>
                <Icon name="camera" size={16}/>
              </button>
            </div>
            <div className={isMobile ? '' : 'flex-1'}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logado via Google</div>
              <h2 className="text-2xl font-black mt-1" style={{ color: palette.dark }}>{user.name}</h2>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className={`flex gap-2 mt-3 ${isMobile ? 'justify-center' : ''}`}>
                <button className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5"
                        style={{ color: palette.dark }}>
                  <Icon name="edit" size={12}/> Editar nome
                </button>
                <button className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5"
                        style={{ color: palette.dark }}>
                  <Icon name="camera" size={12}/> Trocar foto
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cor do avatar */}
        <div className="bg-white rounded-[28px] p-6 md:p-7 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Avatar</div>
              <h3 className="text-base font-black" style={{ color: palette.dark }}>Cor de fundo</h3>
            </div>
            <Badge color={palette.secondary} size="sm">Personalizado</Badge>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {avatarColors.map(c => (
              <button key={c} onClick={() => setUser({ ...user, color: c })}
                className={`aspect-square rounded-2xl transition hover:scale-110 relative`}
                style={{
                  background: c,
                  boxShadow: user.color === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : 'none',
                }}>
                {user.color === c && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <Icon name="check" size={16} strokeWidth={3}/>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Stats pessoais */}
        <div className="bg-white rounded-[28px] p-6 md:p-7 border border-slate-100 shadow-sm">
          <h3 className="text-base font-black mb-4" style={{ color: palette.dark }}>Suas estatísticas</h3>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <PillStat label="Ligas" value="3" accent={palette.secondary}/>
            <PillStat label="Pontos" value="0" accent={palette.primary}/>
            <PillStat label="Acertos" value="0/0" accent={palette.dark}/>
            <PillStat label="Bolões" value="1" accent="#7E4FE3"/>
          </div>
        </div>

        {/* Notificações + Sair */}
        <div className="bg-white rounded-[28px] p-3 border border-slate-100 shadow-sm">
          <button className="w-full p-3 rounded-2xl flex items-center gap-3 hover:bg-slate-50 transition">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${palette.secondary}15`, color: palette.secondary }}>
              <Icon name="bell" size={16}/>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-bold" style={{ color: palette.dark }}>Notificações</div>
              <div className="text-xs text-slate-500">Lembrar antes do prazo</div>
            </div>
            <Icon name="chevronRight" size={16} style={{ color: '#94a3b8' }}/>
          </button>
          <button className="w-full p-3 rounded-2xl flex items-center gap-3 hover:bg-slate-50 transition">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${palette.secondary}15`, color: palette.secondary }}>
              <Icon name="settings" size={16}/>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-bold" style={{ color: palette.dark }}>Privacidade</div>
              <div className="text-xs text-slate-500">Quem vê seus palpites</div>
            </div>
            <Icon name="chevronRight" size={16} style={{ color: '#94a3b8' }}/>
          </button>
          <button onClick={onLogout} className="w-full p-3 rounded-2xl flex items-center gap-3 hover:bg-red-50 transition mt-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <Icon name="logout" size={16}/>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-bold text-red-600">Sair da conta</div>
              <div className="text-xs text-slate-500">Desconectar do Google</div>
            </div>
            <Icon name="chevronRight" size={16} style={{ color: '#94a3b8' }}/>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  BracketScreen, BracketRoundView, BracketTeamRow, PlaceholderTeam,
  RankingScreen, Podium, ProfileScreen,
});
