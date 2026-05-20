import axios from "axios";
import store from "../store";
import { logout } from "../store/slices/authSlice";

const axiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
	timeout: 10000,
	headers: { "Content-Type": "application/json" },
});

// Attach JWT to every request automatically
axiosInstance.interceptors.request.use(
	(config) => {
		const token = store.getState().auth.token;
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Handle 401 globally - log user out if token is expired
axiosInstance.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			store.dispatch(logout());
		}
		return Promise.reject(error);
	}
);

export default axiosInstance;
