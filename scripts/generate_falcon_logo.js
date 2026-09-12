const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <linearGradient id="orbit-ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#818cf8" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.2"/>
    </linearGradient>

    <linearGradient id="gold-beak-light" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>

    <linearGradient id="gold-beak-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="60%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>

    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#000000" flood-opacity="0.14" />
    </filter>
  </defs>

  <!-- 1. Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- 2. Hexagonal Architectural Gateway Frame -->
      <polygon points="
        0,-390
        338,-195
        338,195
        0,390
        -338,195
        -338,-195
      " fill="none" stroke="#0f172a" stroke-width="38" stroke-linejoin="round" />

      <polygon points="
        0,-355
        307,-177
        307,177
        0,355
        -307,177
        -307,-177
      " fill="none" stroke="#00f5ff" stroke-width="3.5" opacity="0.45" stroke-dasharray="16, 12" />

      <!-- Back Half of Orbital Telemetry Ring -->
      <path d="M -305,-75 A 325 115 -25 0 1 295,145" fill="none" stroke="url(#orbit-ring)" stroke-width="6" stroke-dasharray="8, 8" opacity="0.38" />

      <!-- 3. Watertight Base Silhouette for Peregrine Falcon Mascot (Dynamic Stepped Wings) -->
      <path d="
        M 0,-295
        L 45,-255 L 85,-220 L 115,-165 L 145,-140 L 275,-50 L 250,40 L 220,130 L 180,210 L 120,290 L 0,345
        L -120,290 L -180,210 L -220,130 L -250,40 L -275,-50 L -145,-140 L -115,-165 L -85,-220 L -45,-255
        Z
      " fill="#070a12" />

      <!-- === Outer Wings: Stepped Primary & Secondary Flight Feathers === -->
      <!-- Left Wing (Shadow Facets) -->
      <polygon points="-145,-140 -275,-50 -210,10 -130,-40" fill="#0f172a" />
      <polygon points="-275,-50 -250,40 -195,80 -210,10" fill="#1e293b" />
      <polygon points="-250,40 -220,130 -165,150 -195,80" fill="#0f172a" />
      <polygon points="-220,130 -180,210 -130,220 -165,150" fill="#1e293b" />
      <polygon points="-180,210 -120,290 -75,270 -130,220" fill="#0f172a" />

      <!-- Right Wing (Illuminated Facets) -->
      <polygon points="145,-140 275,-50 210,10 130,-40" fill="#334155" />
      <polygon points="275,-50 250,40 195,80 210,10" fill="#475569" />
      <polygon points="250,40 220,130 165,150 195,80" fill="#334155" />
      <polygon points="220,130 180,210 130,220 165,150" fill="#475569" />
      <polygon points="180,210 120,290 75,270 130,220" fill="#334155" />

      <!-- Wing Shoulder Fillers -->
      <polygon points="-115,-165 -145,-140 -130,-40 -85,-80" fill="#1e293b" />
      <polygon points="115,-165 145,-140 130,-40 85,-80" fill="#475569" />

      <!-- === Crown & Head Facets === -->
      <polygon points="0,-295 -45,-255 0,-230" fill="#334155" />
      <polygon points="0,-295 45,-255 0,-230" fill="#475569" />
      <polygon points="-45,-255 -85,-220 -50,-175 0,-230" fill="#1e293b" />
      <polygon points="45,-255 85,-220 50,-175 0,-230" fill="#334155" />
      <polygon points="-85,-220 -115,-165 -75,-145 -50,-175" fill="#0f172a" />
      <polygon points="85,-220 115,-165 75,-145 50,-175" fill="#1e293b" />

      <!-- === Supraorbital Falcon Brow (Supraorbital Ridge) === -->
      <polygon points="0,-230 -50,-175 -40,-135 0,-155" fill="#475569" />
      <polygon points="0,-230 50,-175 40,-135 0,-155" fill="#64748b" />
      <polygon points="-50,-175 -75,-145 -40,-135" fill="#334155" />
      <polygon points="50,-175 75,-145 40,-135" fill="#475569" />

      <!-- === Silver-Slate Cheek Patch (Iconic Peregrine Field Mark) === -->
      <polygon points="-75,-145 -115,-165 -85,-80" fill="#64748b" />
      <polygon points="75,-145 115,-165 85,-80" fill="#94a3b8" />

      <!-- === Black Malar Tear Stripe (Falcon Helmet Mustache) === -->
      <polygon points="-40,-135 -85,-80 -70,-20 -30,-50" fill="#070a12" />
      <polygon points="40,-135 85,-80 70,-20 30,-50" fill="#1e293b" />

      <!-- === Predatory Electric Cyan Eyes (Slanted Raptor Almonds) === -->
      <!-- Left Eye Socket & Almond -->
      <polygon points="-40,-135 -75,-145 -72,-120 -38,-115" fill="#070a12" />
      <polygon points="-42,-132 -71,-141 -68,-122 -40,-118" fill="url(#cyan-glow)" />
      <polygon points="-54,-131 -64,-134 -61,-125 -52,-124" fill="#ffffff" opacity="0.95" />

      <!-- Right Eye Socket & Almond -->
      <polygon points="40,-135 75,-145 72,-120 38,-115" fill="#070a12" />
      <polygon points="42,-132 71,-141 68,-122 40,-118" fill="url(#cyan-glow)" />
      <polygon points="54,-131 64,-134 61,-125 52,-124" fill="#ffffff" opacity="0.95" />

      <!-- === Raptor Beak & Cere === -->
      <!-- Upper Beak Bridge (Culmen) -->
      <polygon points="0,-155 -22,-95 0,-80" fill="#475569" />
      <polygon points="0,-155 22,-95 0,-80" fill="#64748b" />
      <polygon points="-22,-95 0,-80 0,-25 -25,-40" fill="#334155" />
      <polygon points="22,-95 0,-80 0,-25 25,-40" fill="#475569" />

      <!-- Curved Golden Raptor Beak Hook -->
      <polygon points="0,-25 -25,-40 -12,25 0,38" fill="url(#gold-beak-shadow)" />
      <polygon points="0,-25 25,-40 12,25 0,38" fill="url(#gold-beak-light)" />
      <!-- Sharp Beak Tip Specular Highlight -->
      <polygon points="0,15 -6,27 0,38 6,27" fill="#ffffff" opacity="0.8" />

      <!-- === Throat Chevron & Keel Breastplate Armor === -->
      <polygon points="0,38 -30,-50 -45,30 0,80" fill="#1e293b" />
      <polygon points="0,38 30,-50 45,30 0,80" fill="#334155" />

      <!-- Mid Keel Armor Plates -->
      <polygon points="0,80 -45,30 -85,45 -50,135 0,155" fill="#0f172a" />
      <polygon points="0,80 45,30 85,45 50,135 0,155" fill="#1e293b" />
      <polygon points="-45,30 -70,-20 -130,-40 -85,45" fill="#0b0f19" />
      <polygon points="45,30 70,-20 130,-40 85,45" fill="#1e293b" />

      <!-- Lower Breastplate & Flight Covert Plates -->
      <polygon points="0,155 -50,135 -85,210 0,235" fill="#1e293b" />
      <polygon points="0,155 50,135 85,210 0,235" fill="#334155" />
      <polygon points="-50,135 -130,220 -85,210" fill="#0f172a" />
      <polygon points="50,135 130,220 85,210" fill="#1e293b" />

      <!-- Autonomous Keel Nexus Core (Subtle Cyan Diamond) -->
      <polygon points="0,140 -12,155 0,170 12,155" fill="#00f5ff" />
      <polygon points="0,145 -6,155 0,165 6,155" fill="#ffffff" />

      <!-- Tail Wedge Vectors -->
      <polygon points="0,235 -85,210 -75,270 0,345" fill="#070a12" />
      <polygon points="0,235 85,210 75,270 0,345" fill="#1e293b" />

      <!-- Front Arc of Orbital Telemetry Ring -->
      <path d="M 295,145 A 325 115 -25 0 1 -305,-75" fill="none" stroke="url(#orbit-ring)" stroke-width="8" stroke-linecap="round" />

      <!-- Orbital Sentry Node (Autonomous Satellite Beacon) -->
      <circle cx="218" cy="192" r="14" fill="#00f5ff" />
      <circle cx="218" cy="192" r="6" fill="#ffffff" />
      <circle cx="218" cy="192" r="22" fill="none" stroke="#00f5ff" stroke-width="2.5" opacity="0.75" stroke-dasharray="4, 4" />

      <!-- Secondary Opposite Orbital Anchor -->
      <circle cx="-240" cy="-32" r="6" fill="#818cf8" opacity="0.8" />

    </g>
  </g>
</svg>`;
}

function run() {
  const svg = buildLogoSvg();
  const docsDir = path.join(__dirname, '..', 'docs', 'images');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const svgPath = path.join(docsDir, 'logo.svg');
  const pngPath = path.join(docsDir, 'logo.png');

  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log(`Saved SVG to: ${svgPath}`);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 2048 },
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngData);
  console.log(`Rendered PNG to: ${pngPath} (2048x2048)`);

  const artifactPng = 'C:\\Users\\alexander\\.gemini\\antigravity-ide\\brain\\44e104b9-9e10-4208-a6a7-3ca7a8deb873\\logo.png';
  fs.writeFileSync(artifactPng, pngData);
  console.log(`Copied PNG to brain artifact: ${artifactPng}`);
}

run();
