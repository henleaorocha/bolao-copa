// ─────────────────────────────────────────────────────────────
// ICONS — Lucide-style inline SVGs
// Uso: <Icon name="trophy" size={20} className="..." />
// ─────────────────────────────────────────────────────────────

const ICON_PATHS = {
  trophy: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  login: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  chevronRight: 'M9 18l6-6-6-6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronDown: 'M6 9l6 6 6-6',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  copy: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  medal: 'M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15M11 12 5.12 2.2M13 12l5.88-9.8M8 7h8M12 22a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  check: 'M20 6L9 17l-5-5',
  checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6L6 18M6 6l12 12',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM7 11V7a5 5 0 0 1 10 0v4',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z',
  crown: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zM2 20h20',
  award: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  flag: 'M4 22V4a1 1 0 0 1 1-1h13l-3 5 3 5H6M4 22h2',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  qrCode: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h2v2h-2zM18 14h3v2M14 18v3h7v-3M16 16h2',
  sparkles: 'M9 3L11 9L17 11L11 13L9 19L7 13L1 11L7 9zM19 13L19.7 15.3L22 16L19.7 16.7L19 19L18.3 16.7L16 16L18.3 15.3z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  trending: 'M22 7l-9.5 9.5-5-5L1 18M17 7h5v5',
  refresh: 'M3 12a9 9 0 0 1 15.5-6.3L22 9M22 4v5h-5M21 12a9 9 0 0 1-15.5 6.3L2 15M2 20v-5h5',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M13.73 21a2 2 0 0 1-3.46 0',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  google: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z|M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z|M5.84 14.09c-.22-.66-.35-1.36-.35-2.09 0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84Z|M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z',
  settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  whatsapp: 'M17.5 14c-.5-.25-1.71-.84-2-.94-.27-.1-.46-.15-.66.14-.19.29-.74.94-.91 1.13-.17.19-.34.22-.62.07-1.4-.7-2.32-1.25-3.24-2.83-.24-.42.24-.39.69-1.29.08-.16.04-.3-.02-.42-.06-.12-.66-1.59-.91-2.18-.24-.57-.48-.49-.66-.5-.17 0-.36-.01-.55-.01a1 1 0 0 0-.77.37c-.27.3-1.02 1-1.02 2.43s1.04 2.82 1.19 3.02c.15.19 2.05 3.14 4.97 4.4 1.85.8 2.57.87 3.5.73.57-.08 1.71-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.13-.26-.2-.55-.34zM12 2a10 10 0 0 0-8.6 15.07L2 22l5.07-1.4A10 10 0 1 0 12 2z',
  podium: 'M3 22V11h6v11M9 22V7h6v15M15 22V14h6v8',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  refresh2: 'M21 12a9 9 0 0 1-9 9M3 12a9 9 0 0 1 9-9M21 12c0-2.5-1-4.7-2.6-6.4M3 12c0 2.5 1 4.7 2.6 6.4',
  fire: 'M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 5 0c0-1.8-1.3-2.5-1.5-3.5-.4-1.5.5-3 .5-3-3 0-3 2-3 2-1 0-2-2-2-2-4 1-5.5 4-5.5 6.5 0 1.5.5 3 1 4 0 0-2 .5-2 2 0 1.5 1 2.5 2.5 2.5h11c1.5 0 2.5-1 2.5-2.5 0-1-.5-1.5-1.5-2 .5-2 0-4-2-5.5',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
};

function Icon({ name, size = 20, className = '', strokeWidth = 2, style = {}, fill = 'none' }) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  const paths = d.split('|');
  // Google icon uses multi-color paths and should use fill not stroke
  if (name === 'google') {
    const colors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style}>
        {paths.map((p, i) => <path key={i} d={p} fill={colors[i]} />)}
      </svg>
    );
  }
  if (name === 'whatsapp') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
        <path d={d}/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
         stroke="currentColor" strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round"
         className={className} style={style}>
      {paths.map((p, i) => <path key={i} d={p}/>)}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// FLAG — bandeira simplificada (faixas verticais com cores nacionais)
// Para um protótipo, abstrai a bandeira como faixas; emoji como fallback
// (mas emoji nem sempre rendeiza bem em browsers, então preferimos div)
// ─────────────────────────────────────────────────────────────
function Flag({ team, size = 32, rounded = true, style = {} }) {
  const colors = (window.TEAM_COLORS || {})[team] || ['#94A3B8', '#CBD5E1'];
  const w = typeof size === 'number' ? size : 32;
  const h = Math.round(w * 0.7);
  return (
    <div style={{
      width: w, height: h,
      borderRadius: rounded ? Math.round(w * 0.15) : 0,
      overflow: 'hidden',
      display: 'flex',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.2)',
      flexShrink: 0,
      ...style,
    }}>
      {colors.map((c, i) => (
        <div key={i} style={{ flex: 1, background: c }} />
      ))}
    </div>
  );
}

// TeamChip — bandeira + nome
function TeamChip({ team, size = 'md', code = false }) {
  const sizes = {
    sm: { flag: 18, font: '0.75rem' },
    md: { flag: 24, font: '0.875rem' },
    lg: { flag: 32, font: '1rem' },
    xl: { flag: 44, font: '1.5rem' },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Flag team={team} size={s.flag} />
      <span style={{ fontWeight: 700, fontSize: s.font, color: '#244C5A' }}>
        {code ? (window.TEAM_CODES || {})[team] || team.slice(0, 3).toUpperCase() : team}
      </span>
    </div>
  );
}

Object.assign(window, { Icon, ICON_PATHS, Flag, TeamChip });
