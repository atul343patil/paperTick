import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { TrendingUp, Eye, EyeOff } from "lucide-react";
import { register } from "../store/slices/authSlice";
import useAuth from "../hooks/useAuth";
import toast from "react-hot-toast";

const Register = () => {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { isLoading, error, isAuthenticated, clearError } = useAuth();

	const [form, setForm] = useState({ name: "", email: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);

	useEffect(() => {
		if (isAuthenticated) navigate("/markets", { replace: true });
	}, [isAuthenticated]);

	useEffect(() => {
		if (error) {
			toast.error(error);
			clearError();
		}
	}, [error]);

	const handleChange = (e) => {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!form.name || !form.email || !form.password) {
			toast.error("Please fill in all fields.");
			return;
		}
		if (form.password.length < 6) {
			toast.error("Password must be at least 6 characters.");
			return;
		}
		dispatch(register(form));
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<Link
					to="/"
					className="flex items-center gap-2 justify-center mb-8 text-textPrimary"
				>
					<TrendingUp size={22} className="text-primary" />
					<span className="font-semibold text-lg">paperTick</span>
				</Link>

				<div className="card">
					<h1 className="text-xl font-semibold text-textPrimary mb-1">
						Create your account
					</h1>
					<p className="text-textSecondary text-sm mb-6">
						Start with Rs 1,00,000 virtual capital - no real money needed
					</p>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-medium text-textSecondary mb-1.5">
								Full name
							</label>
							<input
								type="text"
								name="name"
								value={form.name}
								onChange={handleChange}
								placeholder="Your name"
								className="input-field"
								autoComplete="name"
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-textSecondary mb-1.5">
								Email address
							</label>
							<input
								type="email"
								name="email"
								value={form.email}
								onChange={handleChange}
								placeholder="you@example.com"
								className="input-field"
								autoComplete="email"
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-textSecondary mb-1.5">
								Password
							</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									name="password"
									value={form.password}
									onChange={handleChange}
									placeholder="Min. 6 characters"
									className="input-field pr-10"
									autoComplete="new-password"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((p) => !p)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textSecondary"
								>
									{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="btn-primary w-full mt-2"
						>
							{isLoading ? "Creating account..." : "Create Account"}
						</button>
					</form>

					<p className="text-center text-sm text-textSecondary mt-5">
						Already have an account?{" "}
						<Link
							to="/login"
							className="text-primary hover:underline font-medium"
						>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
};

export default Register;
