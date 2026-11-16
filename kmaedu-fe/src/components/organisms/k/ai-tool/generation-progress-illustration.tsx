/** Tilted clipboard with three red checks, a clock badge and sparkles on a soft pink blob (generation in progress art). */
export function GenerationProgressIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" fill="none" aria-hidden className={className}>
      {/* soft blob behind */}
      <path
        d="M52 64c18-34 70-48 108-32 34 14 56 46 50 82-6 38-44 66-86 66-36 0-74-14-88-44-10-22-2-48 16-72Z"
        fill="#FDE8E7"
      />
      <path d="M40 110c-4-26 18-46 40-50 12 30 6 74-12 92-16-8-26-22-28-42Z" fill="#FBD5D3" opacity="0.6" />

      {/* clipboard (tilted) */}
      <g transform="rotate(-8 112 104)" filter="url(#gp-shadow)">
        <rect x="62" y="40" width="104" height="132" rx="14" fill="#FCA5A5" />
        <rect x="68" y="47" width="92" height="118" rx="10" fill="#fff" />
        {/* clip */}
        <rect x="92" y="30" width="44" height="22" rx="7" fill="#EE2F2B" />
        <circle cx="114" cy="31" r="7" fill="#EE2F2B" />
        <circle cx="114" cy="31" r="3" fill="#fff" />
        {/* checks + lines */}
        <path d="m80 82 6 6 11-13" stroke="#EE2F2B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="104" y="78" width="44" height="7" rx="3.5" fill="#FCD5D3" />
        <path d="m80 108 6 6 11-13" stroke="#EE2F2B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="104" y="104" width="44" height="7" rx="3.5" fill="#FCD5D3" />
        <path d="m80 134 6 6 11-13" stroke="#EE2F2B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="104" y="130" width="30" height="7" rx="3.5" fill="#FCD5D3" />
      </g>

      {/* clock badge */}
      <g filter="url(#gp-shadow)">
        <circle cx="168" cy="140" r="32" fill="#EE2F2B" />
        <circle cx="168" cy="140" r="24" fill="#fff" />
        <path d="M168 126v15h11" stroke="#EE2F2B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* sparkles */}
      <path d="M36 52c1.6 6 3.4 7.8 9.4 9.4-6 1.6-7.8 3.4-9.4 9.4-1.6-6-3.4-7.8-9.4-9.4 6-1.6 7.8-3.4 9.4-9.4Z" fill="#EE2F2B" />
      <path d="M200 70c1.1 4.2 2.4 5.4 6.6 6.6-4.2 1.1-5.5 2.4-6.6 6.6-1.1-4.2-2.4-5.5-6.6-6.6 4.2-1.2 5.5-2.4 6.6-6.6Z" fill="#F87171" />

      <defs>
        <filter id="gp-shadow" x="0" y="0" width="240" height="200" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#EE2F2B" floodOpacity="0.18" />
        </filter>
      </defs>
    </svg>
  );
}
