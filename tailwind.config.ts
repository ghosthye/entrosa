import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'background': "var(--bg-background)",
        'surface': "var(--bg-surface)",
        'primary': "var(--text-primary)",
        'secondary': "var(--text-secondary)",
        'border-color': "var(--border-color)",
        'verde-campo': 'var(--verde-campo)',
        'verde-grama': 'var(--verde-grama)',
        'amarelo-gol': 'var(--amarelo-gol)',
        'vermelho-erro': 'var(--vermelho-erro)',
        'azul-info': 'var(--azul-info)',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        display: ['var(--font-bebas-neue)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      keyframes: {
        'float-up': {
          '0%': { transform: 'translateY(10vh)' },
          '100%': { transform: 'translateY(-120vh)' },
        }
      },
      animation: {
        'float-up': 'float-up linear infinite',
      }
    },
  },
  plugins: [],
};
export default config;
