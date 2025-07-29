/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./index.html"
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
          mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace']
        },
        colors: {
          primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
          secondary: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          }
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-out forwards',
          'slide-in': 'slideIn 0.5s ease-out forwards',
          'shimmer': 'shimmer 1.5s ease-in-out infinite',
          'bounce-soft': 'bounce 2s infinite',
          'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0', transform: 'translateY(10px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          },
          slideIn: {
            '0%': { opacity: '0', transform: 'translateX(-20px)' },
            '100%': { opacity: '1', transform: 'translateX(0)' },
          },
          shimmer: {
            '0%': { backgroundPosition: '-468px 0' },
            '100%': { backgroundPosition: '468px 0' },
          }
        },
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
          '92': '23rem',
          '96': '24rem',
          '128': '32rem',
        },
        screens: {
          'xs': '475px',
          '3xl': '1600px',
        },
        aspectRatio: {
          '4/3': '4 / 3',
          '21/9': '21 / 9',
        },
        lineClamp: {
          7: '7',
          8: '8',
          9: '9',
          10: '10',
        },
        boxShadow: {
          'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
          'strong': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          'colored': '0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)',
          'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        },
        backdropBlur: {
          xs: '2px',
        },
        zIndex: {
          '60': '60',
          '70': '70',
          '80': '80',
          '90': '90',
          '100': '100',
        },
        transitionProperty: {
          'width': 'width',
          'spacing': 'margin, padding',
        },
        transitionTimingFunction: {
          'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        },
        borderRadius: {
          '4xl': '2rem',
          '5xl': '2.5rem',
        },
        fontSize: {
          'xxs': '0.625rem',
          '2.5xl': '1.75rem',
          '3.5xl': '2rem',
          '4.5xl': '2.5rem',
        },
        maxWidth: {
          '8xl': '88rem',
          '9xl': '96rem',
        },
        gridTemplateColumns: {
          '13': 'repeat(13, minmax(0, 1fr))',
          '14': 'repeat(14, minmax(0, 1fr))',
          '15': 'repeat(15, minmax(0, 1fr))',
          '16': 'repeat(16, minmax(0, 1fr))',
        }
      },
    },
    plugins: [
      require('@tailwindcss/line-clamp'),
      require('@tailwindcss/aspect-ratio'),
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
    ],
    // Safelist important classes that might be used dynamically
    safelist: [
      'animate-spin',
      'animate-pulse',
      'animate-bounce',
      'animate-fade-in',
      'animate-slide-in',
      'animate-shimmer',
      {
        pattern: /bg-(red|green|blue|yellow|purple|pink|indigo)-(50|100|500|600|700)/,
      },
      {
        pattern: /text-(red|green|blue|yellow|purple|pink|indigo)-(50|100|500|600|700|800|900)/,
      },
      {
        pattern: /border-(red|green|blue|yellow|purple|pink|indigo)-(200|300|400|500)/,
      },
      {
        pattern: /line-clamp-[1-10]/,
      }
    ]
  }