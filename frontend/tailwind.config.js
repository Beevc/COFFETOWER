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
          border: "#ECE1CE",
          text: "#2B1D14",
          textSoft: "#8A7867",
          accent: "#C9721C",       // caramelo (paleta 5)
          accentDark: "#A85E17",
          accentSoft: "#F6E7D0",
          honey: "#E4A11B",        // acento secundario (destacados)
          sidebar: "#3A2417",      // chocolate (barra lateral)
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
