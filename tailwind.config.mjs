/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores corporativos UPK
        "upk-blue": "#001c71",
        "upk-blue-soft": "#102885",
        "upk-blue-light": "#1f3fb3",
      },
      boxShadow: {
        "upk-soft": "0 18px 35px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        "upk-lg": "1.25rem",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
