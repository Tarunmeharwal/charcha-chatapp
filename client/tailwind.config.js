/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'SF Pro Text', 'sans-serif'],
        dm: ['"DM Sans"'],
      },
      colors: {
        apple: {
          canvas: '#F5F5F7',
          blue: '#0071E3',
          'blue-hover': '#0077ED',
          'blue-tint': '#E8F2FF',
          bubble: '#E9E9EB',
          subtle: '#86868B',
          border: 'rgba(0, 0, 0, 0.06)',
        }
      },
      boxShadow: {
        'bento': '0 4px 24px -1px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'apple-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'pill': '0 2px 8px -1px rgba(0, 113, 227, 0.25)',
        'tab-active': '0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
      }
    }
  },
  plugins: [],
};
