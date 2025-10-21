/**
 * Academic Avatar Generator
 * Purpose: Generate unique, academic-themed avatars using math, science, and English symbols
 * Instead of human faces, creates pattern-based avatars with educational symbols
 */

// Academic symbols by category
const SYMBOLS = {
  math: ['∑', 'π', '∞', '√', '∫', 'θ', 'α', 'β', '∆', '≈', '≠', '±', '×', '÷', 'φ', 'λ'],
  science: ['⚛', '🔬', '🧪', '🧬', '⚡', '🌍', '🔭', '🌡', '⚗', '🧲', '💡', '🌟', '🔥', '💧', '🌈', '☀'],
  english: ['📖', '✍', '📝', '📚', '💬', '🖋', '📜', '✒', '🎭', '📰', '🗣', '💭', '🎓', '📄', '✨', '🎪']
};

// Color palettes for different moods
const COLOR_PALETTES = [
  // Academic blue
  { bg: '#1e3a8a', fg: '#60a5fa', accent: '#dbeafe' },
  // Science green
  { bg: '#065f46', fg: '#34d399', accent: '#d1fae5' },
  // English purple
  { bg: '#581c87', fg: '#c084fc', accent: '#f3e8ff' },
  // Math orange
  { bg: '#9a3412', fg: '#fb923c', accent: '#fed7aa' },
  // Teal professional
  { bg: '#134e4a', fg: '#5eead4', accent: '#ccfbf1' },
  // Indigo modern
  { bg: '#312e81', fg: '#818cf8', accent: '#e0e7ff' },
];

/**
 * Generate a deterministic hash from a string (for consistent avatars)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Select items deterministically based on seed
 */
function selectFromArray<T>(array: T[], seed: number, count: number = 1): T[] {
  const selected: T[] = [];
  for (let i = 0; i < count; i++) {
    const index = (seed + i * 7) % array.length;
    selected.push(array[index]);
  }
  return selected;
}

/**
 * Generate SVG avatar with academic symbols
 */
export function generateAcademicAvatar(userId: string, size: number = 150): string {
  const seed = hashString(userId);

  // Select color palette
  const palette = COLOR_PALETTES[seed % COLOR_PALETTES.length];

  // Select symbols (2-3 symbols per avatar)
  const allSymbols = [...SYMBOLS.math, ...SYMBOLS.science, ...SYMBOLS.english];
  const selectedSymbols = selectFromArray(allSymbols, seed, 3);

  // Generate positions for symbols (deterministic based on seed)
  const positions = [
    { x: 30 + (seed % 20), y: 40 + ((seed * 3) % 20), size: 50 },
    { x: 70 + ((seed * 5) % 20), y: 60 + ((seed * 7) % 20), size: 40 },
    { x: 50 + ((seed * 11) % 20), y: 90 + ((seed * 13) % 20), size: 35 },
  ];

  // Create SVG
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="grad-${userId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${palette.fg};stop-opacity:1" />
        </linearGradient>

        <!-- Pattern for texture -->
        <pattern id="pattern-${userId}" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1.5" fill="${palette.accent}" opacity="0.3"/>
        </pattern>
      </defs>

      <!-- Background -->
      <rect width="150" height="150" fill="url(#grad-${userId})" rx="8"/>

      <!-- Pattern overlay -->
      <rect width="150" height="150" fill="url(#pattern-${userId})" rx="8"/>

      <!-- Symbols -->
      ${selectedSymbols.map((symbol, i) => `
        <text
          x="${positions[i].x}"
          y="${positions[i].y}"
          font-size="${positions[i].size}"
          fill="${palette.accent}"
          opacity="0.9"
          font-family="system-ui, -apple-system, sans-serif"
        >${symbol}</text>
      `).join('')}

      <!-- Border -->
      <rect
        width="150"
        height="150"
        fill="none"
        stroke="${palette.accent}"
        stroke-width="2"
        rx="8"
        opacity="0.3"
      />
    </svg>
  `;

  // Convert SVG to data URL
  const encoded = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Alternative: Simple geometric pattern avatar (fallback option)
 */
export function generateGeometricAvatar(userId: string, size: number = 150): string {
  const seed = hashString(userId);
  const palette = COLOR_PALETTES[seed % COLOR_PALETTES.length];

  // Generate 4x4 grid of squares (mirrored for symmetry)
  const grid = [];
  for (let i = 0; i < 16; i++) {
    const shouldFill = ((seed >> i) & 1) === 1;
    grid.push(shouldFill);
  }

  const cellSize = 150 / 4;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
      <rect width="150" height="150" fill="${palette.bg}"/>
      ${grid.map((shouldFill, i) => {
        if (!shouldFill) return '';
        const row = Math.floor(i / 4);
        const col = i % 4;
        return `
          <rect
            x="${col * cellSize}"
            y="${row * cellSize}"
            width="${cellSize}"
            height="${cellSize}"
            fill="${palette.fg}"
            opacity="0.8"
          />
        `;
      }).join('')}
    </svg>
  `;

  const encoded = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get avatar URL for a user profile
 * Uses academic-themed avatars instead of human faces
 */
export function getAcademicAvatarUrl(userId: string, style: 'symbols' | 'geometric' = 'symbols'): string {
  if (style === 'geometric') {
    return generateGeometricAvatar(userId);
  }
  return generateAcademicAvatar(userId);
}
