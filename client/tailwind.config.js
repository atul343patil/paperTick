/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,jsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Poppins", "sans-serif"],
			},
			colors: {
				background: "#0A0E1A",
				surface: "#111827",
				surfaceAlt: "#1A2236",
				border: "#1F2D45",
				primary: "#3B82F6",
				primaryHover: "#2563EB",
				success: "#22C55E",
				danger: "#EF4444",
				warning: "#F59E0B",
				textPrimary: "#F1F5F9",
				textSecondary: "#94A3B8",
				textMuted: "#4B5563",
			},
			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
			},
		},
	},
	plugins: [],
};
