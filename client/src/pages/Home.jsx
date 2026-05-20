import { Link } from "react-router-dom";
import { TrendingUp, BarChart2, Shield, Zap } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

const FEATURES = [
	{
		icon: <TrendingUp size={22} className="text-primary" />,
		title: "Real Market Data",
		desc: "Live charts and prices powered by real market feeds. Practice with actual market conditions.",
	},
	{
		icon: <BarChart2 size={22} className="text-primary" />,
		title: "Options Analytics",
		desc: "Full option chain with Greeks, strategy builder, and payoff visualization.",
	},
	{
		icon: <Zap size={22} className="text-primary" />,
		title: "ML-Powered Pricing",
		desc: "Our hybrid LSTM + CNN model prices options with higher accuracy than Black-Scholes.",
	},
	{
		icon: <Shield size={22} className="text-primary" />,
		title: "Zero Risk",
		desc: "Trade with Rs 1,00,000 virtual capital. Learn without losing real money.",
	},
];

const Home = () => {
	const { isAuthenticated } = useAuth();

	// Redirect logged-in users
	if (isAuthenticated) return <Navigate to="/markets" replace />;

	return (
		<div className="min-h-screen bg-background">
			{/* Top bar */}
			<header className="h-14 border-b border-border flex items-center px-8 justify-between">
				<div className="flex items-center gap-2">
					<TrendingUp size={20} className="text-primary" />
					<span className="font-semibold text-base text-textPrimary">
						paperTick
					</span>
				</div>
				<div className="flex items-center gap-3">
					<Link to="/login" className="btn-ghost text-sm">
						Sign In
					</Link>
					<Link to="/register" className="btn-primary text-sm">
						Get Started
					</Link>
				</div>
			</header>

			{/* Hero */}
			<main className="max-w-5xl mx-auto px-6 pt-24 pb-16">
				<div className="text-center mb-20">
					{/* Badge */}
					<span className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full border border-primary/20 mb-6">
						Virtual Trading Platform
					</span>

					<h1 className="text-5xl font-bold text-textPrimary leading-tight mb-6">
						Trade Smarter.
						<br />
						<span className="text-primary">Risk Nothing.</span>
					</h1>

					<p className="text-textSecondary text-lg max-w-xl mx-auto mb-10 leading-relaxed">
						Practice trading Indian equities and options with real market data,
						advanced analytics, and an ML-powered options calculator - all on
						virtual capital.
					</p>

					<div className="flex items-center gap-4 justify-center">
						<Link to="/register" className="btn-primary px-8 py-3 text-sm">
							Start Trading Free
						</Link>
						<Link to="/login" className="btn-ghost px-8 py-3 text-sm">
							Sign In
						</Link>
					</div>
				</div>

				{/* Stats bar */}
				<div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden mb-20">
					{[
						{ label: "Starting Capital", value: "Rs 1,00,000" },
						{ label: "Instruments", value: "NSE + Options" },
						{ label: "Pricing Model", value: "LSTM + CNN" },
					].map(({ label, value }) => (
						<div key={label} className="bg-surface px-6 py-5 text-center">
							<p className="text-xl font-semibold text-textPrimary mb-1">
								{value}
							</p>
							<p className="text-xs text-textSecondary">{label}</p>
						</div>
					))}
				</div>

				{/* Features */}
				<div className="grid grid-cols-2 gap-4">
					{FEATURES.map(({ icon, title, desc }) => (
						<div
							key={title}
							className="card hover:border-primary/30 transition-colors duration-200"
						>
							<div className="flex items-start gap-4">
								<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
									{icon}
								</div>
								<div>
									<h3 className="font-semibold text-textPrimary mb-1 text-sm">
										{title}
									</h3>
									<p className="text-textSecondary text-sm leading-relaxed">
										{desc}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</main>

			{/* Footer */}
			<footer className="border-t border-border py-6 text-center">
				<p className="text-textMuted text-xs">
					paperTick is a virtual trading platform for educational purposes only.
				</p>
			</footer>
		</div>
	);
};

export default Home;
