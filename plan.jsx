// plan.jsx — Top-down pedestrian pavement plan
// Horizontal orientation: NORTH on the LEFT, SOUTH on the RIGHT.
// All units in centimetres (1 SVG unit = 1 cm).

const { useState, useMemo } = React;

// ──────────────────────────────────────────────────────────────
// 1. Geometry (horizontal layout)
// ──────────────────────────────────────────────────────────────
const G = {
  ROAD_W: 110,        // road shown (we only need enough to read the parked car)
  CURB_W: 30,
  PATH_N: 100,        // walkable at north of zone
  PATH_NARROW: 74,    // walkable at narrowest
  PATH_END: 144,      // walkable south of protrusion
  ZONE_LEN: 214,
  HOUSE_DEPTH: 70,    // depth of house shown above wall
  GARAGE_VIS: 230,    // garage door extent shown north of zone
  SOUTH_VIS: 150,     // shown south of narrowest
};

// U axis: horizontal, increases west→east on screen = north→south of street
const U = {
  GARAGE_N: 0,
  GARAGE_S: G.GARAGE_VIS,                                   // 230
  NARROW:   G.GARAGE_VIS + G.ZONE_LEN,                      // 444
  SOUTH:    G.GARAGE_VIS + G.ZONE_LEN + G.SOUTH_VIS,        // 594
  PARKING_N:G.GARAGE_VIS + G.ZONE_LEN / 4,                  // 283.5
};

// V axis: vertical, top of canvas = HOUSE interior; bottom = ROAD far edge
// Curb sits at fixed location
const V_PATH_BOT  = G.HOUSE_DEPTH + G.PATH_END;             // 234 (curb-path edge, fixed for max path)
const V_CURB_BOT  = V_PATH_BOT + G.CURB_W;                  // 264
const V_ROAD_BOT  = V_CURB_BOT + G.ROAD_W;                  // 464
const V_HOUSE_TOP = 0;

// Wall positions (top edge of path) at key u-values
// Path widths 100/74/144 mean wall_v = V_PATH_BOT - width
const V_WALL_NORTH  = V_PATH_BOT - G.PATH_N;     // 134
const V_WALL_NARROW = V_PATH_BOT - G.PATH_NARROW;// 160
const V_WALL_END    = V_PATH_BOT - G.PATH_END;   // 90

const V = {
  HOUSE_TOP: V_HOUSE_TOP,
  WALL_NORTH: V_WALL_NORTH,
  WALL_NARROW: V_WALL_NARROW,
  WALL_END: V_WALL_END,
  PATH_BOT: V_PATH_BOT,
  CURB_BOT: V_CURB_BOT,
  ROAD_BOT: V_ROAD_BOT,
};

// Theme
const C = {
  bg:        '#0a2235',
  ink:       '#dbeeff',
  inkSoft:   'rgba(219,238,255,0.6)',
  inkFaint:  'rgba(219,238,255,0.32)',
  hatch:     '#5ba8e8',
  red:       '#ff8585',
  carEdge:   'rgba(180,220,255,0.6)',
  car:       'rgba(120,180,240,0.18)',
  person:    'rgba(140,225,170,0.95)',
  personOut: '#7be0a4',
  chair:     'rgba(255,150,150,0.95)',
  chairOut:  '#ff8585',
};

const TXT = 'JetBrains Mono';

// ──────────────────────────────────────────────────────────────
// 2. Defs
// ──────────────────────────────────────────────────────────────
function Defs() {
  return (
    <defs>
      <pattern id="hatchHouse" patternUnits="userSpaceOnUse" width="9" height="9"
               patternTransform="rotate(45)">
        <rect width="9" height="9" fill="rgba(255,255,255,0.04)" />
        <line x1="0" y1="0" x2="0" y2="9" stroke={C.hatch} strokeWidth="1" opacity="0.55" />
      </pattern>

      <pattern id="asphalt" patternUnits="userSpaceOnUse" width="22" height="22">
        <rect width="22" height="22" fill="rgba(255,255,255,0.018)" />
        <circle cx="6"  cy="8"  r="0.5" fill="#7eb4e0" opacity="0.45" />
        <circle cx="17" cy="14" r="0.6" fill="#7eb4e0" opacity="0.35" />
        <circle cx="10" cy="18" r="0.4" fill="#7eb4e0" opacity="0.5" />
        <circle cx="3"  cy="3"  r="0.4" fill="#7eb4e0" opacity="0.4" />
      </pattern>

      <pattern id="curbTex" patternUnits="userSpaceOnUse" width="40" height="50">
        <rect width="40" height="50" fill="rgba(255,255,255,0.05)" />
        <line x1="0" y1="0" x2="0" y2="50" stroke="rgba(180,220,255,0.25)" strokeWidth="0.5" />
      </pattern>

      <pattern id="pathTex" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="rgba(255,210,140,0.05)" />
        <circle cx="3" cy="3" r="0.3" fill="rgba(255,210,140,0.5)" />
      </pattern>

      <pattern id="dangerStripe" patternUnits="userSpaceOnUse" width="14" height="14"
               patternTransform="rotate(45)">
        <rect width="14" height="14" fill="rgba(255,133,133,0.10)" />
        <line x1="0" y1="0" x2="0" y2="14" stroke={C.red} strokeWidth="3" opacity="0.28" />
      </pattern>
    </defs>
  );
}

// ──────────────────────────────────────────────────────────────
// 3. Surfaces (road, curb, walkable, optional grid)
// ──────────────────────────────────────────────────────────────
function Surfaces({ showGrid }) {
  const U_LEFT  = U.GARAGE_N - 30;
  const U_RIGHT = U.SOUTH + 30;
  return (
    <g>
      {/* Road */}
      <rect x={U_LEFT} y={V.CURB_BOT} width={U_RIGHT - U_LEFT} height={V.ROAD_BOT - V.CURB_BOT}
            fill="url(#asphalt)" />
      {/* Curb */}
      <rect x={U_LEFT} y={V.PATH_BOT} width={U_RIGHT - U_LEFT} height={G.CURB_W}
            fill="url(#curbTex)" />
      {/* Curb edges */}
      <line x1={U_LEFT} y1={V.PATH_BOT} x2={U_RIGHT} y2={V.PATH_BOT}
            stroke={C.inkSoft} strokeWidth="0.6" />
      <line x1={U_LEFT} y1={V.CURB_BOT} x2={U_RIGHT} y2={V.CURB_BOT}
            stroke={C.inkSoft} strokeWidth="0.6" />

      {/* Walkable path (between wall and curb) */}
      <path d={walkablePath(U_LEFT, U_RIGHT)} fill="url(#pathTex)" />
      <path d={narrowZonePath()} fill="url(#dangerStripe)" />

      {/* 50cm grid */}
      {showGrid && (
        <g style={{ pointerEvents: 'none' }}>
          {Array.from({ length: 16 }, (_, i) => {
            const uv = i * 50;
            if (uv > U_RIGHT + 40) return null;
            return <line key={`gu${i}`} x1={uv} y1={V.HOUSE_TOP - 30} x2={uv} y2={V.ROAD_BOT + 30}
                         stroke="#1a8cff" strokeWidth="0.2" opacity="0.4" />;
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const vv = i * 50;
            if (vv > V.ROAD_BOT + 40) return null;
            return <line key={`gv${i}`} x1={U_LEFT} y1={vv} x2={U_RIGHT} y2={vv}
                         stroke="#1a8cff" strokeWidth="0.2" opacity="0.4" />;
          })}
        </g>
      )}
    </g>
  );
}

function walkablePath(uL, uR) {
  // Polygon of walkable area
  return [
    `M ${uL} ${V.WALL_NORTH}`,
    `L ${U.GARAGE_S} ${V.WALL_NORTH}`,
    `L ${U.NARROW} ${V.WALL_NARROW}`,
    `L ${U.NARROW} ${V.WALL_END}`,
    `L ${uR} ${V.WALL_END}`,
    `L ${uR} ${V.PATH_BOT}`,
    `L ${uL} ${V.PATH_BOT}`,
    'Z',
  ].join(' ');
}

function narrowZonePath() {
  // Triangle/trapezoid in the narrowing zone, highlighted
  return [
    `M ${U.GARAGE_S} ${V.WALL_NORTH}`,
    `L ${U.NARROW} ${V.WALL_NARROW}`,
    `L ${U.NARROW} ${V.PATH_BOT}`,
    `L ${U.GARAGE_S} ${V.PATH_BOT}`,
    'Z',
  ].join(' ');
}

// ──────────────────────────────────────────────────────────────
// 4. House — interior fill + walls + garage door
// ──────────────────────────────────────────────────────────────
function House() {
  const U_LEFT  = U.GARAGE_N - 30;
  const U_RIGHT = U.SOUTH + 30;

  const housePath = [
    `M ${U_LEFT} ${V.HOUSE_TOP - 30}`,
    `L ${U_RIGHT} ${V.HOUSE_TOP - 30}`,
    `L ${U_RIGHT} ${V.WALL_END}`,
    `L ${U.NARROW} ${V.WALL_END}`,
    `L ${U.NARROW} ${V.WALL_NARROW}`,
    `L ${U.GARAGE_S} ${V.WALL_NORTH}`,
    `L ${U_LEFT} ${V.WALL_NORTH}`,
    'Z',
  ].join(' ');

  // Wall inner edge (the face of the wall toward the path)
  const wallEdge = [
    `M ${U_LEFT} ${V.WALL_NORTH}`,
    `L ${U.GARAGE_S} ${V.WALL_NORTH}`,
    `L ${U.NARROW} ${V.WALL_NARROW}`,
    `L ${U.NARROW} ${V.WALL_END}`,
    `L ${U_RIGHT} ${V.WALL_END}`,
  ].join(' ');

  // Garage door extent along u-axis (within the north wall)
  const doorU1 = 10;
  const doorU2 = U.GARAGE_S - 10;

  return (
    <g>
      {/* House interior, hatched */}
      <path d={housePath} fill="url(#hatchHouse)" stroke="none" />

      {/* Inner wall edge — but skip over the garage door opening with a mask */}
      {/* Solid wall segments (split around door) */}
      <line x1={doorU2} y1={V.WALL_NORTH} x2={U.GARAGE_S} y2={V.WALL_NORTH}
            stroke={C.ink} strokeWidth="1.6" />
      {/* Wall east of garage (along taper + south) */}
      <path d={`M ${U.GARAGE_S} ${V.WALL_NORTH}
                L ${U.NARROW} ${V.WALL_NARROW}
                L ${U.NARROW} ${V.WALL_END}
                L ${U_RIGHT} ${V.WALL_END}`}
            fill="none" stroke={C.ink} strokeWidth="1.6" strokeLinejoin="miter" />
      {/* Wall west of garage opening (left of door) */}
      <line x1={U_LEFT} y1={V.WALL_NORTH} x2={doorU1} y2={V.WALL_NORTH}
            stroke={C.ink} strokeWidth="1.6" />

      {/* Garage door — dashed indicating the door panel + jamb ticks */}
      <line x1={doorU1} y1={V.WALL_NORTH} x2={doorU2} y2={V.WALL_NORTH}
            stroke={C.ink} strokeWidth="1.1" strokeDasharray="7 4" opacity="0.85" />
      {/* Jamb ticks (perpendicular to wall) */}
      <line x1={doorU1} y1={V.WALL_NORTH - 7} x2={doorU1} y2={V.WALL_NORTH + 7}
            stroke={C.ink} strokeWidth="1.4" />
      <line x1={doorU2} y1={V.WALL_NORTH - 7} x2={doorU2} y2={V.WALL_NORTH + 7}
            stroke={C.ink} strokeWidth="1.4" />

      {/* Garage label */}
      <text x={(doorU1 + doorU2) / 2} y={V.WALL_NORTH - 32}
            textAnchor="middle" fill={C.inkSoft} fontSize="14"
            fontFamily={TXT} letterSpacing="6">GARAGE</text>

      {/* House label (south side, in the bigger interior area south of protrusion) */}
      <text x={U.NARROW + 75} y={V.WALL_END - 14}
            fill={C.inkSoft} fontSize="14" fontFamily={TXT} letterSpacing="6">
        HAUS
      </text>

      {/* Callout circle at the narrowest corner */}
      <circle cx={U.NARROW} cy={V.WALL_NARROW} r="3.5"
              fill={C.bg} stroke={C.red} strokeWidth="1.6" />
    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// 5. Parking spot + parked car
// ──────────────────────────────────────────────────────────────
function ParkingSpot({ show }) {
  if (!show) return null;
  const U_LEFT  = U.GARAGE_N - 30;
  const U_RIGHT = U.SOUTH + 30;
  const carL = 460;
  const carW = 178;
  const carU = U.PARKING_N + 14;
  const carV = V.CURB_BOT + 8;

  return (
    <g clipPath="url(#roadClip)">
      <defs>
        <clipPath id="roadClip">
          <rect x={U_LEFT - 2} y={V.PATH_BOT}
                width={U_RIGHT - U_LEFT + 4}
                height={V.ROAD_BOT - V.PATH_BOT} />
        </clipPath>
      </defs>

      {/* Parking-spot box (dashed outline) */}
      <rect x={U.PARKING_N} y={V.CURB_BOT + 4}
            width={500} height={G.ROAD_W - 8}
            fill="none" stroke="rgba(255,220,140,0.55)" strokeWidth="0.7"
            strokeDasharray="8 5" />
      <text x={U.PARKING_N + 10} y={V.CURB_BOT + 17}
            fill="rgba(255,220,140,0.85)" fontSize="10"
            fontFamily={TXT} letterSpacing="2">PARKPLATZ</text>

      {/* Parked car (partial view — its other side extends beyond shown road) */}
      <g>
        <rect x={carU} y={carV} width={carL} height={carW} rx="34" ry="22"
              fill={C.car} stroke={C.carEdge} strokeWidth="1.2" />
        {/* Front windshield (east end) */}
        <path d={`M ${carU + carL - 130} ${carV + 14}
                  L ${carU + carL - 130} ${carV + carW - 14}
                  L ${carU + carL - 80}  ${carV + carW - 20}
                  L ${carU + carL - 80}  ${carV + 20} Z`}
              fill="rgba(180,220,255,0.18)" stroke={C.carEdge} strokeWidth="0.6" />
        {/* Rear window (west end) */}
        <path d={`M ${carU + 130} ${carV + 14}
                  L ${carU + 130} ${carV + carW - 14}
                  L ${carU + 80}  ${carV + carW - 20}
                  L ${carU + 80}  ${carV + 20} Z`}
              fill="rgba(180,220,255,0.18)" stroke={C.carEdge} strokeWidth="0.6" />
        {/* Side mirrors on curb side (top edge) */}
        <rect x={carU + 90} y={carV - 8} width={18} height={10} rx="3"
              fill={C.car} stroke={C.carEdge} strokeWidth="0.8" />
        {/* Centre dash (roof) */}
        <line x1={carU + 150} y1={carV + carW / 2}
              x2={carU + carL - 150} y2={carV + carW / 2}
              stroke={C.carEdge} strokeWidth="0.4" strokeDasharray="5 3" opacity="0.6" />
        <text x={carU + carL / 2} y={carV + 70}
              fill="rgba(180,220,255,0.75)" fontSize="11"
              fontFamily={TXT} letterSpacing="3" textAnchor="middle">GEPARKTES AUTO</text>
        <text x={carU + carL / 2} y={carV + 84}
              fill="rgba(180,220,255,0.45)" fontSize="8"
              fontFamily={TXT} letterSpacing="1" textAnchor="middle">≈460×178 cm</text>
      </g>
    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// 6. Scale figures
// ──────────────────────────────────────────────────────────────
function ScaleFigures({ figure }) {
  const cu = U.NARROW - 70;
  const cv = (V.WALL_NORTH + V.PATH_BOT) / 2 + 8;
  if (figure === 'none') return null;
  if (figure === 'person')     return <Person cu={cu} cv={cv} />;
  if (figure === 'wheelchair') return <Wheelchair cu={cu} cv={cv} />;
  if (figure === 'two')        return (
    <g>
      <Person cu={cu} cv={cv - 18} muted />
      <Person cu={cu} cv={cv + 18} muted />
      <text x={cu} y={V.PATH_BOT + 16} textAnchor="middle"
            fill={C.red} fontSize="10" fontFamily={TXT} letterSpacing="0.5"
            fontWeight="700">2 Personen nebeneinander: ≈100 cm — passt nicht</text>
    </g>
  );
}

function Person({ cu, cv, muted }) {
  const fill = muted ? 'rgba(140,225,170,0.45)' : C.person;
  const out  = muted ? 'rgba(140,225,170,0.7)'  : C.personOut;
  // Top-down: shoulders 50cm wide (along v), 25cm deep (along u)
  return (
    <g>
      <ellipse cx={cu} cy={cv} rx="12" ry="25" fill={fill} stroke={out} strokeWidth="0.8" />
      <circle  cx={cu} cy={cv} r="9"          fill={fill} stroke={out} strokeWidth="0.8" />
      {!muted && (
        <text x={cu} y={cv + 38} textAnchor="middle"
              fill={out} fontSize="9" fontFamily={TXT}
              letterSpacing="1.2" fontWeight="600">~50 cm Schulterbreite</text>
      )}
    </g>
  );
}

function Wheelchair({ cu, cv }) {
  // Top-down: ~70cm wide x ~110cm long; oriented along u (walking direction)
  const w = 70, l = 110;
  return (
    <g>
      {/* Frame */}
      <rect x={cu - l/2} y={cv - w/2} width={l} height={w} rx="6"
            fill={C.chair} stroke={C.chairOut} strokeWidth="0.9" />
      {/* Wheels (large rear, perpendicular to motion) */}
      <rect x={cu - 28} y={cv - w/2 - 5} width={55} height={10} rx="2"
            fill={C.chairOut} opacity="0.85" />
      <rect x={cu - 28} y={cv + w/2 - 5} width={55} height={10} rx="2"
            fill={C.chairOut} opacity="0.85" />
      <circle cx={cu - 8} cy={cv} r="9" fill="rgba(40,40,40,0.45)" />
      <text x={cu} y={cv + 50} textAnchor="middle"
            fill={C.chairOut} fontSize="9" fontFamily={TXT}
            letterSpacing="1.2" fontWeight="600">~70 cm Rollstuhl</text>
    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// 7. Dimension lines
// ──────────────────────────────────────────────────────────────
// Vertical dimension at u, between v1 and v2.
function VDim({ u, v1, v2, label, sub, accent, fromU1, fromU2 }) {
  const stroke = accent ? C.red : C.ink;
  const txtCol = accent ? C.red : C.ink;
  const eF1 = fromU1 != null ? fromU1 : u + 8;
  const eF2 = fromU2 != null ? fromU2 : u + 8;
  // Determine direction from extension to dim line (label sits AWAY from object)
  const labelW = String(label).length * 8 + 8;
  return (
    <g>
      <line x1={eF1} y1={v1} x2={u} y2={v1}
            stroke={stroke} strokeWidth="0.5" opacity="0.6" strokeDasharray="4 3" />
      <line x1={eF2} y1={v2} x2={u} y2={v2}
            stroke={stroke} strokeWidth="0.5" opacity="0.6" strokeDasharray="4 3" />
      <line x1={u} y1={v1} x2={u} y2={v2} stroke={stroke} strokeWidth="0.8" />
      <line x1={u - 4} y1={v1 - 4} x2={u + 4} y2={v1 + 4} stroke={stroke} strokeWidth="1.2" />
      <line x1={u - 4} y1={v2 - 4} x2={u + 4} y2={v2 + 4} stroke={stroke} strokeWidth="1.2" />
      <g transform={`translate(${u}, ${(v1 + v2) / 2}) rotate(-90)`}>
        <rect x={-labelW/2} y={-13} width={labelW} height={26}
              fill={C.bg} opacity="0.85" rx="2" />
        <text textAnchor="middle" fill={txtCol} fontSize="15"
              fontFamily={TXT} fontWeight="700" letterSpacing="0.5"
              dy="-2">{label}</text>
        {sub && (
          <text textAnchor="middle" fill={C.inkSoft} fontSize="9"
                fontFamily={TXT} letterSpacing="0.5"
                dy="10">{sub}</text>
        )}
      </g>
    </g>
  );
}

// Horizontal dimension at v, between u1 and u2.
function HDim({ v, u1, u2, label, sub, accent, fromV1, fromV2 }) {
  const stroke = accent ? C.red : C.ink;
  const txtCol = accent ? C.red : C.ink;
  const eF1 = fromV1 != null ? fromV1 : v - 8;
  const eF2 = fromV2 != null ? fromV2 : v - 8;
  const labelW = String(label).length * 8 + 8;
  return (
    <g>
      <line x1={u1} y1={eF1} x2={u1} y2={v} stroke={stroke} strokeWidth="0.5"
            opacity="0.6" strokeDasharray="4 3" />
      <line x1={u2} y1={eF2} x2={u2} y2={v} stroke={stroke} strokeWidth="0.5"
            opacity="0.6" strokeDasharray="4 3" />
      <line x1={u1} y1={v} x2={u2} y2={v} stroke={stroke} strokeWidth="0.8" />
      <line x1={u1 - 4} y1={v - 4} x2={u1 + 4} y2={v + 4} stroke={stroke} strokeWidth="1.2" />
      <line x1={u2 - 4} y1={v - 4} x2={u2 + 4} y2={v + 4} stroke={stroke} strokeWidth="1.2" />
      <rect x={(u1 + u2) / 2 - labelW/2} y={v - 14} width={labelW} height={20}
            fill={C.bg} opacity="0.85" rx="2" />
      <text x={(u1 + u2) / 2} y={v - 1} textAnchor="middle"
            fill={txtCol} fontSize="14" fontFamily={TXT}
            fontWeight="700" letterSpacing="0.5">{label}</text>
      {sub && (
        <text x={(u1 + u2) / 2} y={v + 14} textAnchor="middle"
              fill={C.inkSoft} fontSize="9" fontFamily={TXT}
              letterSpacing="0.5">{sub}</text>
      )}
    </g>
  );
}

function Dimensions({ show }) {
  if (!show) return null;
  return (
    <g>
      {/* Width 130cm — at u just past garage door */}
      <VDim u={U.GARAGE_S + 14}
            v1={V.WALL_NORTH + 0.7} v2={V.CURB_BOT}
            fromU1={U.GARAGE_S + 2} fromU2={U.GARAGE_S + 2}
            label="130 cm" sub="Bordstein 30 + begehbar 100" />

      {/* Narrowest 104cm — at u right at the corner */}
      <VDim u={U.NARROW + 14}
            v1={V.WALL_NARROW} v2={V.CURB_BOT}
            fromU1={U.NARROW + 2} fromU2={U.NARROW + 2}
            label="104 cm" sub="Bordstein 30 + begehbar 74"
            accent />

      {/* South width 174cm — east of protrusion */}
      <VDim u={U.NARROW + 70}
            v1={V.WALL_END + 0.8} v2={V.CURB_BOT}
            fromU1={U.NARROW + 30} fromU2={U.NARROW + 30}
            label="174 cm" sub="Bordstein 30 + begehbar 144" />

      {/* 30cm curb-only sub-dimension on the north end */}
      <VDim u={U.GARAGE_N - 14}
            v1={V.PATH_BOT} v2={V.CURB_BOT}
            fromU1={U.GARAGE_N - 30} fromU2={U.GARAGE_N - 30}
            label="30" />
      <text x={U.GARAGE_N - 26} y={V.PATH_BOT + 16} textAnchor="end"
            fill={C.inkSoft} fontSize="9" fontFamily={TXT}
            letterSpacing="1.2">Bordstein</text>

      {/* Length 214cm — above the path, between garage_s and narrow */}
      <HDim v={V.HOUSE_TOP - 22}
            u1={U.GARAGE_S} u2={U.NARROW}
            fromV1={V.WALL_NORTH} fromV2={V.WALL_NARROW}
            label="214 cm"
            sub="von Kante Garagentor → engste Stelle" />

    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// 8. Labels and callouts
// ──────────────────────────────────────────────────────────────
function Labels() {
  const U_LEFT  = U.GARAGE_N - 30;
  const U_RIGHT = U.SOUTH + 30;
  return (
    <g>
      {/* Road label */}
      <text x={(U_LEFT + U_RIGHT) / 2} y={V.ROAD_BOT - 14}
            textAnchor="middle" fill={C.inkSoft} fontSize="14"
            fontFamily={TXT} letterSpacing="8">MALZGASSE</text>

      {/* Curb label (small) — north side */}
      <text x={U.SOUTH + 10} y={V.PATH_BOT + 20}
            fill={C.inkFaint} fontSize="9" fontFamily={TXT}
            letterSpacing="2">BORDSTEIN</text>

      {/* Compass arrows on left and right margins */}
      <g transform={`translate(${U_LEFT - 50}, ${(V.HOUSE_TOP + V.ROAD_BOT)/2})`}>
        <text textAnchor="middle" fill={C.inkFaint} fontSize="11"
              fontFamily={TXT} letterSpacing="2" y="-8">← Obere Augarten Strasse</text>
      </g>
      <g transform={`translate(${U_RIGHT + 50}, ${(V.HOUSE_TOP + V.ROAD_BOT)/2})`}>
        <text textAnchor="middle" fill={C.inkFaint} fontSize="11"
              fontFamily={TXT} letterSpacing="2" y="-8">Leopoldsgasse →</text>
      </g>

      {/* Callout for the narrowest pinch */}
      <g>
        <line x1={U.NARROW} y1={V.WALL_NARROW}
              x2={U.NARROW - 70} y2={V.WALL_NARROW - 60}
              stroke={C.red} strokeWidth="0.6" opacity="0.7" />
        <circle cx={U.NARROW - 70} cy={V.WALL_NARROW - 60} r="2" fill={C.red} />
        <text x={U.NARROW - 78} y={V.WALL_NARROW - 64}
              fill={C.red} fontSize="11" fontFamily={TXT}
              fontWeight="700" letterSpacing="1" textAnchor="end">ENGSTE STELLE</text>
        <text x={U.NARROW - 78} y={V.WALL_NARROW - 52}
              fill={C.inkSoft} fontSize="9" fontFamily={TXT}
              letterSpacing="0.5" textAnchor="end">Hausvorsprung-Ecke</text>
      </g>
    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// 9. North arrow, scale bar, title block
// ──────────────────────────────────────────────────────────────
function NorthArrow({ cu, cv }) {
  return (
    <g transform={`translate(${cu} ${cv})`}>
      <circle r="32" fill="rgba(8,30,50,0.6)" stroke={C.ink} strokeWidth="0.8" />
      {/* Arrow pointing LEFT (north is on the left in this orientation) */}
      <path d="M -26 0 L 14 -8 L 6 0 L 14 8 Z" fill={C.ink} />
      <text x="-26" y="-26" textAnchor="end" fill={C.ink} fontSize="14"
            fontFamily={TXT} fontWeight="700">N</text>
    </g>
  );
}

function ScaleBar({ x, y }) {
  const segW = 50;
  return (
    <g transform={`translate(${x} ${y})`}>
      <text y="-9" fill={C.inkSoft} fontSize="10" fontFamily={TXT}
            letterSpacing="2">MASSSTAB</text>
      <rect x="0"        y="0" width={segW} height="6" fill={C.ink} />
      <rect x={segW}     y="0" width={segW} height="6" fill="none" stroke={C.ink} strokeWidth="0.8" />
      <rect x={segW * 2} y="0" width={segW} height="6" fill={C.ink} />
      <text x="0"          y="22" fill={C.ink} fontSize="9" fontFamily={TXT}>0</text>
      <text x={segW}       y="22" textAnchor="middle" fill={C.ink} fontSize="9" fontFamily={TXT}>50</text>
      <text x={segW * 2}   y="22" textAnchor="middle" fill={C.ink} fontSize="9" fontFamily={TXT}>100</text>
      <text x={segW * 3}   y="22" textAnchor="middle" fill={C.ink} fontSize="9" fontFamily={TXT}>150 cm</text>
    </g>
  );
}

function TitleBlock({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="270" height="86"
            fill="rgba(8,30,50,0.7)" stroke={C.inkFaint} strokeWidth="0.6" />
      <line x1="0" y1="22" x2="270" y2="22" stroke={C.inkFaint} strokeWidth="0.4" />
      <line x1="0" y1="58" x2="270" y2="58" stroke={C.inkFaint} strokeWidth="0.4" />
      <line x1="170" y1="22" x2="170" y2="86" stroke={C.inkFaint} strokeWidth="0.4" />
      <text x="10" y="15" fill={C.inkSoft} fontSize="8"
            fontFamily={TXT} letterSpacing="2">ZEICHNUNG</text>
      <text x="10" y="40" fill={C.ink} fontSize="13"
            fontFamily="Inter" fontWeight="700">Gehweg</text>
      <text x="10" y="52" fill={C.inkSoft} fontSize="9"
            fontFamily={TXT} letterSpacing="0.5">Draufsicht · Breitenerhebung</text>
      <text x="10" y="72" fill={C.inkSoft} fontSize="8"
            fontFamily={TXT} letterSpacing="1.5">EINHEIT</text>
      <text x="10" y="83" fill={C.ink} fontSize="11" fontFamily={TXT}>Zentimeter</text>
      <text x="180" y="72" fill={C.inkSoft} fontSize="8"
            fontFamily={TXT} letterSpacing="1.5">ANSICHT</text>
      <text x="180" y="83" fill={C.ink} fontSize="11" fontFamily={TXT}>Grundriss / 1:1</text>
    </g>
  );
}

// ──────────────────────────────────────────────────────────────
// 10. Blueprint
// ──────────────────────────────────────────────────────────────
function Blueprint({ t }) {
  const marginU = 70;
  const marginVTop = 55;
  const marginVBot = 120;
  const vb = {
    x: U.GARAGE_N - marginU,
    y: V.HOUSE_TOP - marginVTop,
    w: (U.SOUTH + marginU) - (U.GARAGE_N - marginU),
    h: (V.ROAD_BOT + marginVBot) - (V.HOUSE_TOP - marginVTop),
  };
  return (
    <svg
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      style={{ width: '100%', height: '100%', display: 'block' }}
      fontFamily="Inter, system-ui, sans-serif"
      preserveAspectRatio="xMidYMid meet"
    >
      <Defs />

      {/* Frame */}
      <rect x={vb.x + 14} y={vb.y + 14}
            width={vb.w - 28} height={vb.h - 28}
            fill="none" stroke={C.inkFaint} strokeWidth="0.8" />
      <rect x={vb.x + 20} y={vb.y + 20}
            width={vb.w - 40} height={vb.h - 40}
            fill="none" stroke={C.inkFaint} strokeWidth="0.3" />

      <Surfaces showGrid={t.showGrid} />
      <ParkingSpot show={t.showParking} />
      <House />
      <Dimensions show={t.showDims} />
      <ScaleFigures figure={t.figure} />
      <Labels />

      <TitleBlock x={vb.x + vb.w - 290} y={vb.y + vb.h - 100} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// 11. App shell + Tweaks
// ──────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "figure": "none",
  "showParking": false,
  "showDims": false,
  "showGrid": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  return (
    <div className="app-shell">
      <div className="app-header"><Header /></div>
      <div className="app-svg"><Blueprint t={t} /></div>
      <div className="app-legend"><Legend /></div>
      <TweaksPanel title="Einstellungen">
        <TweakSection label="Maßstabsfigur" />
        <TweakRadio
          label="An der engsten Stelle"
          value={t.figure}
          options={['person', 'wheelchair', 'two', 'none']}
          onChange={(v) => setTweak('figure', v)}
        />
        <TweakSection label="Ebenen" />
        <TweakToggle label="Maßlinien" value={t.showDims}
                     onChange={(v) => setTweak('showDims', v)} />
        <TweakToggle label="Parkplatz + Auto" value={t.showParking}
                     onChange={(v) => setTweak('showParking', v)} />
        <TweakToggle label="50 cm Raster" value={t.showGrid}
                     onChange={(v) => setTweak('showGrid', v)} />
      </TweaksPanel>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10,
                      letterSpacing: 3, color: C.inkSoft, flex: 'none' }}>BLATT 01 · GRUNDRISS</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700,
                     letterSpacing: '-0.01em', color: C.ink, flex: 'none' }}>
          Der Gehweg, vermessen.
        </h1>
      </div>
      <p style={{ margin: 0, color: C.inkSoft, maxWidth: 620,
                  fontSize: 12.5, lineHeight: 1.4 }}>
        Ein Hausvorsprung verengt den Gehweg auf{' '}
        <strong style={{color: C.red}}>104 cm gesamt — nur 74 cm begehbare Fläche</strong>{' '}bevor er sich wieder weitet.
      </p>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: C.inkFaint,
                    textAlign: 'right', lineHeight: 1.6, letterSpacing: 1,
                    marginLeft: 'auto', flex: 'none' }}>
        <div>EINHEIT · cm</div>
        <div>ANSICHT · Draufsicht</div>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { sw: 'url(#asphalt)', label: 'Straße / Asphalt' },
    { sw: 'url(#curbTex)', label: 'Bordstein (30 cm)' },
    { sw: 'url(#pathTex)', label: 'begehbarer Gehweg' },
    { sw: 'url(#hatchHouse)', label: 'Haus (Schnitt)' },
    { sw: 'url(#dangerStripe)', label: '214 cm Verengungszone' },
  ];
  return (
    <div style={{ padding: '10px 14px', display: 'flex', gap: 18, flexWrap: 'wrap',
                  border: `0.5px solid rgba(219,238,255,0.15)`,
                  background: 'rgba(8,30,50,0.5)',
                  fontFamily: 'JetBrains Mono', fontSize: 11, color: C.inkSoft,
                  letterSpacing: 1, alignItems: 'center' }}>
      <div style={{ letterSpacing: 2, color: C.inkFaint }}>LEGENDE</div>
      {/* Need an inline SVG so patterns resolve via local <defs> in main SVG.
          Use a small inline SVG with its own def of each pattern. */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="lgAsphalt" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect width="10" height="10" fill="rgba(255,255,255,0.06)" />
            <circle cx="3" cy="3" r="0.6" fill="#7eb4e0" opacity="0.55" />
            <circle cx="7" cy="7" r="0.5" fill="#7eb4e0" opacity="0.5" />
          </pattern>
          <pattern id="lgCurb" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect width="10" height="10" fill="rgba(255,255,255,0.08)" />
            <line x1="0" y1="5" x2="10" y2="5" stroke="rgba(180,220,255,0.5)" strokeWidth="0.5" />
          </pattern>
          <pattern id="lgPath" patternUnits="userSpaceOnUse" width="5" height="5">
            <rect width="5" height="5" fill="rgba(255,210,140,0.10)" />
            <circle cx="2.5" cy="2.5" r="0.4" fill="rgba(255,210,140,0.7)" />
          </pattern>
          <pattern id="lgHouse" patternUnits="userSpaceOnUse" width="6" height="6"
                   patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#5ba8e8" strokeWidth="1.2" />
          </pattern>
          <pattern id="lgDanger" patternUnits="userSpaceOnUse" width="9" height="9"
                   patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="9" stroke="#ff8585" strokeWidth="2" opacity="0.3" />
          </pattern>
        </defs>
      </svg>
      {items.map((it, i) => {
        const swatchId = ['lgAsphalt','lgCurb','lgPath','lgHouse','lgDanger'][i];
        return (
          <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="28" height="14" style={{ flex: 'none' }}>
              <rect width="28" height="14" fill={`url(#${swatchId})`}
                    stroke="rgba(219,238,255,0.32)" strokeWidth="0.5" />
            </svg>
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
