/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Tokens
        brand: {
          bg: '#FAF9F6', // Warm White
          card: '#FFFFFF', // Pure White
          elevated: '#FAFAFA', // Soft White
          graphite: '#1C1C1E', // Graphite
          slate: '#86868B', // Slate Grey
          blue: '#0F2C59', // Deep Luxury Brand Navy
          green: '#10B981', // Emerald Green
          orange: '#FF6600', // Premium Orange
          red: '#FF3366', // Soft Red (Wishlist)
          border: '#E5E5EA' // Softer grey border
        },

        quick: {
          green: '#10B981', // Emerald Green
          lightGreen: '#ECFDF5',
          yellow: '#ffd600',
          dark: '#1C1C1E',
          gray: '#86868B',
          border: '#E5E5EA'
        },
        services: {
          gold: '#C5A880', // Luxury Gold
          darkGold: '#A88D65',
          bg: '#1C1C1E', // Graphite Dark Background
          card: '#2C2C2E', // Apple style elevated dark grey card
          text: '#F5F5F7',
          gray: '#86868B',
          border: '#2C2C2E'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        numbers: ['Manrope', 'monospace']
      },
      boxShadow: {
        premium: '0 4px 12px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.01)',
        elevated: '0 10px 24px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.01)',
        'hover-lift': '0 24px 48px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.02)',
        soft: '0 2px 8px rgba(0, 0, 0, 0.01)',
        md3_1: '0 4px 12px rgba(0, 0, 0, 0.02)',
        md3_2: '0 10px 24px rgba(0, 0, 0, 0.04)',
        md3_3: '0 24px 48px rgba(0, 0, 0, 0.06)',

      },
      borderRadius: {

        'md3': '14px',
        'md3-lg': '18px',
        input: '14px',
        button: '14px',
        card: '18px',
        hero: '24px',
        'bottom-nav': '20px'
      },
      zIndex: {
        '45': '45',
      }
    },
  },
  plugins: [],
}


