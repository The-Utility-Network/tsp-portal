import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        // TUC Standard Palette Mappings
        brand: {
          50: '#e0f7ff',
          100: '#b3ecff',
          200: '#80e0ff',
          300: '#4dd5ff',
          400: '#26caff',
          500: '#00ccff', // Primary Brand (Synthwave Blue)
          600: '#00a3cc',
          700: '#007a99',
          800: '#005266',
          900: '#002933',
          950: '#00141a', // Dark Glass Bg
        },
        accent: {
          DEFAULT: '#ff69b4', // Hot Pink
          500: '#ff69b4',
        },
        emerald: {
          "50": "#fdf4ff",   // very light pink
          "100": "#f8d7ff",  // light pink
          "200": "#f0a6ff",  // soft pink
          "300": "#e875ff",  // medium pink
          "400": "#e044ff",  // vibrant pink
          "500": "#d813ff",  // base pink
          "600": "#b300cc",  // medium dark pink
          "700": "#8e0099",  // darker pink
          "800": "#00ccff",  // deep pink
          "900": "#440033"   // very deep pink
        },
        hotPink: "#ff69b4", // pink
        orangeSunset: "#ffa500", // orange
        synthwaveBlue: "#00ccff", // sky blue typical of synthwave
      },
      fontFamily: {
        rajdhani: ['var(--font-rajdhani)'],
        inter: ['var(--font-inter)'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    // Add scrollbar hide plugin if needed or keep using custom CSS
  ],
};
export default config;
