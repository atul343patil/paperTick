const Loader = ({ fullScreen = false, size = "md" }) => {
	const sizeClasses = {
		sm: "w-4 h-4 border-2",
		md: "w-8 h-8 border-2",
		lg: "w-12 h-12 border-3",
	};

	const spinner = (
		<div
			className={`${sizeClasses[size]} rounded-full border-border border-t-primary animate-spin`}
		/>
	);

	if (fullScreen) {
		return (
			<div className="fixed inset-0 bg-background flex items-center justify-center z-50">
				{spinner}
			</div>
		);
	}

	return spinner;
};

export default Loader;
