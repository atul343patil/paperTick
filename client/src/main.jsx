import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import store from "./store/index";
import App from "./App.jsx";
import "./styles/globals.css";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<Provider store={store}>
			<App />
			<Toaster
				position="top-right"
				toastOptions={{
					style: {
						background: "#1A2236",
						color: "#F1F5F9",
						border: "1px solid #1F2D45",
						fontFamily: "Poppins, sans-serif",
						fontSize: "14px",
					},
					success: { iconTheme: { primary: "#22C55E", secondary: "#1A2236" } },
					error: { iconTheme: { primary: "#EF4444", secondary: "#1A2236" } },
				}}
			/>
		</Provider>
	</StrictMode>
);
