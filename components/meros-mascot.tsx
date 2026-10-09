/**
 * Meros mascot — rounded graphite robot with a domed helmet, antenna stubs,
 * stubby arms and two emissive green eyes. Pure layered SVG (no raster asset),
 * so it stays crisp at any hero size. Eye bloom lives in HTML overlays in the
 * hero so it can breathe on the compositor without re-rasterising filters.
 */

const HEAD =
  "M65 200 A135 130 0 0 1 335 200 L335 228 Q335 252 310 254 Q200 262 90 254 Q65 252 65 228 Z";
const BODY =
  "M82 256 L318 256 Q326 256 326 266 C328 330 328 380 326 422 C325 478 298 498 200 502 C102 498 75 478 74 422 C72 380 72 330 74 266 Q74 256 82 256 Z";
const ARM =
  "M-19 -6 C-19 -21 19 -21 19 -6 L25 74 C26 110 -26 110 -25 74 Z";
const EYES = [144, 256];
const EYE_Y = 182;

/** Eye centres as % of the SVG box, for positioning HTML glow overlays. */
export const MASCOT_EYES = EYES.map((x) => ({
  left: `${(x / 400) * 100}%`,
  top: `${((EYE_Y - 44) / 464) * 100}%`,
}));

export function MerosMascot({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 44 400 464"
      className={className}
      role="img"
      aria-labelledby="meros-mascot-title"
    >
      <title id="meros-mascot-title">Meros robot mascot</title>
      <defs>
        <linearGradient id="mm-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c1012" />
          <stop offset="0.1" stopColor="#1b2225" />
          <stop offset="0.32" stopColor="#3b4549" />
          <stop offset="0.48" stopColor="#323b3f" />
          <stop offset="0.74" stopColor="#1d2427" />
          <stop offset="0.93" stopColor="#12181a" />
          <stop offset="1" stopColor="#1f3a27" />
        </linearGradient>
        <linearGradient id="mm-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0.3" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="mm-head" cx="0.38" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#5d686d" />
          <stop offset="0.28" stopColor="#3e474c" />
          <stop offset="0.62" stopColor="#242b2f" />
          <stop offset="1" stopColor="#0e1315" />
        </radialGradient>
        <radialGradient id="mm-bounce" cx="0.32" cy="0.25" r="0.95">
          <stop offset="0.6" stopColor="#77FF75" stopOpacity="0" />
          <stop offset="1" stopColor="#77FF75" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="mm-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#9AFF8D" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="mm-socket" cx="0.5" cy="0.45" r="0.5">
          <stop offset="0.7" stopColor="#030605" />
          <stop offset="0.9" stopColor="#0b100f" />
          <stop offset="1" stopColor="#2a3337" />
        </radialGradient>
        <radialGradient id="mm-lens" cx="0.44" cy="0.4" r="0.62">
          <stop offset="0" stopColor="#F4FFEC" />
          <stop offset="0.22" stopColor="#CFFFBA" />
          <stop offset="0.6" stopColor="#8DFF72" />
          <stop offset="1" stopColor="#3DC646" />
        </radialGradient>
        <radialGradient id="mm-spill">
          <stop offset="0" stopColor="#77FF75" stopOpacity="0.3" />
          <stop offset="1" stopColor="#77FF75" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mm-arm-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a555a" />
          <stop offset="0.45" stopColor="#2a3236" />
          <stop offset="1" stopColor="#101416" />
        </linearGradient>
        <linearGradient id="mm-arm-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#141a1c" />
          <stop offset="0.5" stopColor="#283034" />
          <stop offset="0.85" stopColor="#1a2023" />
          <stop offset="1" stopColor="#24432c" />
        </linearGradient>
        <filter id="mm-b2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="mm-b6" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="mm-b12" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <clipPath id="mm-clip-head">
          <path d={HEAD} />
        </clipPath>
        <clipPath id="mm-clip-body">
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* antenna stubs */}
      <g strokeLinecap="round" fill="none">
        <path d="M108 116 L93 58" stroke="#283034" strokeWidth="8" />
        <path d="M292 116 L307 58" stroke="#1c2326" strokeWidth="8" />
        <path d="M105.5 108 L91 61" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" />
        <path d="M294.5 108 L309 61" stroke="#9AFF8D" strokeOpacity="0.2" strokeWidth="2" />
      </g>

      {/* arms (tucked behind the body) */}
      {[
        { t: "translate(86 292) rotate(34)", fill: "url(#mm-arm-l)", hx: -8 },
        { t: "translate(314 292) rotate(-34)", fill: "url(#mm-arm-r)", hx: 8 },
      ].map((a) => (
        <g key={a.t} transform={a.t}>
          <path d={ARM} fill={a.fill} />
          <path d={ARM} fill="url(#mm-shade)" />
          <ellipse cx={a.hx} cy="80" rx="10" ry="15" fill="#fff" opacity="0.07" filter="url(#mm-b2)" />
          <path d={ARM} fill="none" stroke="url(#mm-rim)" strokeWidth="1.2" />
        </g>
      ))}

      {/* body */}
      <path d={BODY} fill="url(#mm-body)" />
      <path d={BODY} fill="url(#mm-shade)" />
      <g clipPath="url(#mm-clip-body)">
        <ellipse cx="140" cy="385" rx="24" ry="92" fill="#fff" opacity="0.07" filter="url(#mm-b12)" />
        <path d="M74 294 Q200 306 326 294" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="2.5" />
        <path d="M74 297.5 Q200 309.5 326 297.5" fill="none" stroke="#fff" strokeOpacity="0.06" strokeWidth="1.5" />
        <ellipse cx="200" cy="258" rx="140" ry="22" fill="#000" opacity="0.7" filter="url(#mm-b6)" />
        <ellipse cx="200" cy="505" rx="140" ry="40" fill="#77FF75" opacity="0.08" filter="url(#mm-b12)" />
      </g>
      <path d={BODY} fill="none" stroke="url(#mm-rim)" strokeOpacity="0.6" strokeWidth="1.5" />

      {/* head */}
      <path d={HEAD} fill="url(#mm-head)" />
      <path d={HEAD} fill="url(#mm-bounce)" />
      <g clipPath="url(#mm-clip-head)">
        <ellipse cx="152" cy="112" rx="74" ry="36" transform="rotate(-18 152 112)" fill="#fff" opacity="0.1" filter="url(#mm-b12)" />
        <ellipse cx="136" cy="102" rx="24" ry="9" transform="rotate(-30 136 102)" fill="#fff" opacity="0.18" filter="url(#mm-b2)" />
        {EYES.map((cx) => (
          <circle key={cx} cx={cx} cy={EYE_Y} r="72" fill="url(#mm-spill)" />
        ))}
        <path
          d="M65 236 Q65 252 90 254 Q200 262 310 254 Q335 252 335 236"
          fill="none"
          stroke="#000"
          strokeOpacity="0.45"
          strokeWidth="6"
          filter="url(#mm-b2)"
        />
      </g>
      <path d={HEAD} fill="none" stroke="url(#mm-rim)" strokeWidth="1.5" />

      {/* eyes */}
      {EYES.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={EYE_Y} r="37" fill="url(#mm-socket)" />
          <circle cx={cx} cy={EYE_Y} r="37" fill="none" stroke="#fff" strokeOpacity="0.07" />
          <circle cx={cx} cy={EYE_Y} r="33" fill="#77FF75" opacity="0.5" filter="url(#mm-b6)" />
          <circle cx={cx} cy={EYE_Y} r="28" fill="url(#mm-lens)" />
          <circle cx={cx} cy={EYE_Y} r="28" fill="none" stroke="#1d5a26" strokeOpacity="0.55" strokeWidth="1.5" />
          <ellipse
            cx={cx - 9}
            cy={EYE_Y - 11}
            rx="8"
            ry="4.5"
            transform={`rotate(-32 ${cx - 9} ${EYE_Y - 11})`}
            fill="#fff"
            opacity="0.6"
          />
        </g>
      ))}
    </svg>
  );
}
