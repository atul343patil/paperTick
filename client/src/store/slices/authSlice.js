import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginUser, registerUser, fetchCurrentUser } from "../../api/authApi";

// Persist token to localStorage so user stays logged in on refresh
const getStoredToken = () => localStorage.getItem("papertick_token");
const getStoredUser = () => {
	try {
		return JSON.parse(localStorage.getItem("papertick_user"));
	} catch {
		return null;
	}
};

// Async thunks
export const login = createAsyncThunk(
	"auth/login",
	async (credentials, { rejectWithValue }) => {
		try {
			const data = await loginUser(credentials);
			return data;
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || "Login failed");
		}
	}
);

export const register = createAsyncThunk(
	"auth/register",
	async (userData, { rejectWithValue }) => {
		try {
			const data = await registerUser(userData);
			return data;
		} catch (err) {
			return rejectWithValue(
				err.response?.data?.message || "Registration failed"
			);
		}
	}
);

export const loadUser = createAsyncThunk(
	"auth/loadUser",
	async (_, { rejectWithValue }) => {
		try {
			const data = await fetchCurrentUser();
			return data;
		} catch (err) {
			return rejectWithValue(err.response?.data?.message || "Session expired");
		}
	}
);

const authSlice = createSlice({
	name: "auth",
	initialState: {
		user: getStoredUser(),
		token: getStoredToken(),
		isLoading: false,
		isAuthenticated: !!getStoredToken(),
		error: null,
	},
	reducers: {
		logout: (state) => {
			state.user = null;
			state.token = null;
			state.isAuthenticated = false;
			state.error = null;
			localStorage.removeItem("papertick_token");
			localStorage.removeItem("papertick_user");
		},
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		const handlePending = (state) => {
			state.isLoading = true;
			state.error = null;
		};
		const handleSuccess = (state, action) => {
			state.isLoading = false;
			state.isAuthenticated = true;
			state.token = action.payload.data.token;
			state.user = action.payload.data.user;
			localStorage.setItem("papertick_token", action.payload.data.token);
			localStorage.setItem(
				"papertick_user",
				JSON.stringify(action.payload.data.user)
			);
		};
		const handleRejected = (state, action) => {
			state.isLoading = false;
			state.error = action.payload;
		};

		builder
			.addCase(login.pending, handlePending)
			.addCase(login.fulfilled, handleSuccess)
			.addCase(login.rejected, handleRejected)
			.addCase(register.pending, handlePending)
			.addCase(register.fulfilled, handleSuccess)
			.addCase(register.rejected, handleRejected)
			.addCase(loadUser.fulfilled, (state, action) => {
				state.user = action.payload.data.user;
				state.isAuthenticated = true;
			})
			.addCase(loadUser.rejected, (state) => {
				state.user = null;
				state.token = null;
				state.isAuthenticated = false;
				localStorage.removeItem("papertick_token");
				localStorage.removeItem("papertick_user");
			});
	},
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
