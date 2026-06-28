import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, TrendingUp } from "lucide-react";
import useAuth from "../../hooks/useAuth";

const NAV_LINKS = [
	{ label: "Markets", path: "/markets" },
	{ label: "Trading", path: "/trading" },
	{ label: "Options", path: "/options" },
	{ label: "Strategies", path: "/strategies" },
	{ label: "Calculator", path: "/calculator" },
];

const Navbar = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/");
	};

	return (
		<header className="h-14 bg-surface border-b border-border flex items-center px-6 sticky top-0 z-40">
			{/* Brand */}
			<Link
				to="/markets"
				className="flex items-center gap-2 mr-10 text-textPrimary"
			>
				<TrendingUp size={20} className="text-primary" />
				<span className="font-semibold text-base tracking-wide">paperTick</span>
			</Link>

			{/* Navigation */}
			<nav className="flex items-center gap-1 flex-1">
				{NAV_LINKS.map(({ label, path }) => (
					<NavLink
						key={path}
						to={path}
						className={({ isActive }) =>
							`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
								isActive
									? "bg-primary/10 text-primary"
									: "text-textSecondary hover:text-textPrimary hover:bg-surfaceAlt"
							}`
						}
					>
						{label}
					</NavLink>
				))}
			</nav>

			{/* User section */}
			<div className="flex items-center gap-4">
				<div className="text-right hidden sm:block">
					<div className="flex items-center gap-3">
						<div>
							<p className="text-xs text-textMuted">Equity</p>
							<p className="text-xs font-semibold text-success">
								₹{user?.virtualBalance?.toLocaleString("en-IN") || "1,00,000"}
							</p>
						</div>
						<div className="w-px h-6 bg-border" />
						<div>
							<p className="text-xs text-textMuted">F&O</p>
							<p className="text-xs font-semibold text-primary">
								₹{user?.fnoBalance?.toLocaleString("en-IN") || "2,00,000"}
							</p>
						</div>
					</div>
				</div>

				<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
					{user?.name?.[0]?.toUpperCase() || "U"}
				</div>

				<button
					onClick={handleLogout}
					className="text-textSecondary hover:text-danger transition-colors duration-200 p-1.5 rounded-lg hover:bg-surfaceAlt"
					title="Logout"
				>
					<LogOut size={16} />
				</button>
			</div>
		</header>
	);
};

export default Navbar;
