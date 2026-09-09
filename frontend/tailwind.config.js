/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta café/crema (heredada del prototipo).
        frappe: {
          bg: "#FAF5EC",
          surface: "#FFFFFF",
          border: "#E8DDC9",
          text: "#2B1D14",
          textSoft: "#6B5645",
          accent: "#B6752B",
          accentDark: "#8A5A1F",
          accentSoft: "#F1E2C8",
          success: "#4F6E4C",
          successSoft: "#E3ECE0",
          danger: "#A8432E",
          dangerSoft: "#F4E1DB",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
