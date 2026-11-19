/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070b16',         // Twilight deep midnight navy
        panel: '#0c1324',      // Twilight indigo card surface
        raised: '#121c33',     // Elevated inputs & hovered rows
        line: '#1c2a4a',       // Subtle glowing slate/indigo borders
        twilight: {
          cyan: '#00f5ff',     // Vibrant neon cyan
          blue: '#3b82f6',     // Electric blue
          indigo: '#6366f1',   // Deep indigo
          violet: '#a855f7',   // Twilight neon violet
          magenta: '#ec4899',  // Neon pink
          pink: '#f43f5e',     // Rose threat pink
          emerald: '#10b981',  // Confirmed / safe green
          amber: '#f59e0b',    // Warning amber
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(0, 245, 255, 0.3)',
        'glow-violet': '0 0 20px -3px rgba(168, 85, 247, 0.3)',
        'glow-magenta': '0 0 20px -3px rgba(236, 72, 153, 0.3)',
      },
    },
  },
  plugins: [],
};
