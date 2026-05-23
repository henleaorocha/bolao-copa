// ─────────────────────────────────────────────────────────────
// SHELL — Sidebar (desktop), BottomNav (mobile), Topbar, Layout
// ─────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'trophy', label: 'Painel' },
  { id: 'matches', icon: 'calendar', label: 'Palpites' },
  { id: 'table', icon: 'list', label: 'Tabela' },
  { id: 'bracket', icon: 'zap', label: 'Mata-mata' },
  { id: 'ranking', icon: 'medal', label: 'Ranking' },
  { id: 'leagues', icon: 'users', label: 'Ligas' },
  { id: 'profile', icon: 'user', label: 'Perfil' },
];

function Sidebar({ view, setView, user, leagueName, palette, onInvite, onLogout, compact = false }) {
  return (
    <aside style={{ background: palette.dark }}
      className={`${compact ? 'w-20' : 'w-64'} text-white min-h-screen p-5 flex flex-col rounded-r-[40px] shadow-2xl shrink-0 relative overflow-hidden`}>
      {/* Glow decorativo */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none"
           style={{ background: palette.secondary }}></div>
      <div className="absolute -bottom-32 -left-20 w-56 h-56 rounded-full opacity-10 blur-3xl pointer-events-none"
           style={{ background: palette.primary }}></div>

      {/* Logo */}
      <div className={`flex items-center gap-3 mb-10 relative z-10 ${compact ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
             style={{ background: palette.primary }}>
          <Icon name="trophy" size={22} style={{ color: palette.dark }} strokeWidth={2.5} />
        </div>
        {!compact && (
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Bolão</div>
            <div className="font-black text-base tracking-wider truncate max-w-[140px]">{leagueName}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1.5 relative z-10">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`w-full flex items-center ${compact ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-2xl transition-all duration-200 group ${
                active ? 'font-bold shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              style={active ? { background: palette.secondary, color: 'white' } : {}}>
              <Icon name={item.icon} size={20} strokeWidth={active ? 2.5 : 2} />
              {!compact && <span className="text-sm">{item.label}</span>}
              {active && !compact && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: palette.primary }}></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Convite */}
      {!compact && (
        <button onClick={onInvite}
          className="relative z-10 mb-3 mt-3 px-4 py-3 rounded-2xl text-left transition hover:scale-[1.02]"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center gap-3">
            <Icon name="share" size={18} style={{ color: palette.primary }} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: palette.primary }}>Convidar</div>
              <div className="text-[11px] text-white/60 truncate max-w-[140px]">Compartilhe o link</div>
            </div>
          </div>
        </button>
      )}

      {/* User + Logout */}
      <div className={`relative z-10 flex items-center ${compact ? 'flex-col gap-3' : 'gap-3'} pt-3 border-t border-white/10`}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0"
             style={{ background: user.color || palette.secondary }}>
          {user.avatar || user.name?.charAt(0)}
        </div>
        {!compact && (
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate">{user.name}</div>
            <button onClick={onLogout} className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 uppercase tracking-wider">
              <Icon name="logout" size={10} /> Sair
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function Topbar({ title, subtitle, palette, action, breadcrumb, user }) {
  return (
    <header className="flex justify-between items-start mb-8 gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        {breadcrumb && (
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2"
               style={{ color: palette.secondary }}>
            {breadcrumb}
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-black leading-tight"
            style={{ color: palette.dark, letterSpacing: '-0.02em' }}>{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

// MobileTopbar — header mais compacto, em mobile
function MobileTopbar({ title, subtitle, palette, leagueName, user, onInvite }) {
  return (
    <header className="px-5 pt-5 pb-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
               style={{ background: palette.dark }}>
            <Icon name="trophy" size={16} style={{ color: palette.primary }} strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[8px] uppercase tracking-widest text-slate-400">Bolão</div>
            <div className="text-xs font-black" style={{ color: palette.dark }}>{leagueName?.slice(0, 18)}</div>
          </div>
        </div>
        <button onClick={onInvite} className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: palette.dark, color: 'white' }}>
          <Icon name="share" size={15}/>
        </button>
      </div>
      <h1 className="text-2xl font-black leading-tight" style={{ color: palette.dark }}>{title}</h1>
      {subtitle && <p className="text-slate-500 text-sm">{subtitle}</p>}
    </header>
  );
}

function BottomNav({ view, setView, palette }) {
  // Mobile: mostrar apenas 5 itens essenciais
  const items2 = [
    { id: 'dashboard', icon: 'trophy', label: 'Painel' },
    { id: 'matches', icon: 'calendar', label: 'Palpites' },
    { id: 'table', icon: 'list', label: 'Tabela' },
    { id: 'ranking', icon: 'medal', label: 'Ranking' },
    { id: 'profile', icon: 'user', label: 'Perfil' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-2 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] z-30">
      <div className="flex items-stretch justify-around">
        {items2.map((item) => {
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className="flex flex-col items-center gap-0.5 flex-1 py-1.5 rounded-2xl transition"
              style={active ? { background: `${palette.secondary}10` } : {}}>
              <Icon name={item.icon} size={20}
                    style={{ color: active ? palette.secondary : '#94a3b8' }}
                    strokeWidth={active ? 2.5 : 2}/>
              <span className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: active ? palette.secondary : '#94a3b8' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// FRAME — wrapper que decide entre layout desktop vs mobile
// ─────────────────────────────────────────────────────────────
function AppFrame({ children, device, view, setView, user, leagueName, palette, onInvite, onLogout, compact }) {
  if (device === 'mobile') {
    return (
      <div className="min-h-screen pb-24" style={{ background: '#F6F8FA' }}>
        {children}
        <BottomNav view={view} setView={setView} palette={palette}/>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen" style={{ background: '#F6F8FA' }}>
      <Sidebar view={view} setView={setView} user={user} leagueName={leagueName}
               palette={palette} onInvite={onInvite} onLogout={onLogout} compact={compact}/>
      <main className="flex-1 p-8 md:p-10 overflow-x-hidden">{children}</main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARDS / BADGES — atoms reutilizáveis
// ─────────────────────────────────────────────────────────────
function Card({ children, className = '', style = {}, padded = true }) {
  return (
    <div className={`bg-white rounded-[28px] shadow-[0_2px_10px_rgba(36,76,90,0.04),0_12px_40px_-12px_rgba(36,76,90,0.08)] border border-slate-100/80 ${padded ? 'p-7' : ''} ${className}`}
         style={style}>{children}</div>
  );
}

function Badge({ children, color = '#0097A9', tone = 'soft', size = 'sm' }) {
  const sizes = { sm: 'text-[10px] px-2.5 py-1', md: 'text-xs px-3 py-1.5' };
  if (tone === 'solid') {
    return <span className={`${sizes[size]} font-bold uppercase tracking-widest rounded-full`}
                 style={{ background: color, color: 'white' }}>{children}</span>;
  }
  return <span className={`${sizes[size]} font-bold uppercase tracking-widest rounded-full`}
               style={{ background: `${color}15`, color }}>{children}</span>;
}

function GroupBadge({ groupName, color = '#244C5A' }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-xs"
         style={{ background: color, color: 'white' }}>
      <span className="opacity-60">GRUPO</span>
      <span>{groupName}</span>
    </div>
  );
}

// PhaseStripe — fita visual indicando fase com cor + nome
function PhaseStripe({ phase, palette, multiplier }) {
  const colors = {
    'Grupos': palette.dark,
    '32 avos': palette.secondary,
    'Oitavas': palette.secondary,
    'Quartas': '#F46036',
    'Semifinal': '#7E4FE3',
    '3º Lugar': '#94a3b8',
    'Final': palette.primary,
  };
  const c = colors[phase] || palette.dark;
  const dark = phase !== 'Final';
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
         style={{ background: dark ? c : `${c}`, color: dark ? 'white' : palette.dark }}>
      <Icon name={phase === 'Final' ? 'crown' : phase.includes('Semi') || phase === 'Quartas' ? 'zap' : 'flag'} size={12}/>
      <span className="text-[10px] font-black uppercase tracking-widest">{phase}</span>
      {multiplier && multiplier > 1 && (
        <span className="text-[10px] font-bold opacity-80">{multiplier}x</span>
      )}
    </div>
  );
}

Object.assign(window, {
  Sidebar, Topbar, MobileTopbar, BottomNav, AppFrame,
  Card, Badge, GroupBadge, PhaseStripe, NAV_ITEMS,
});
