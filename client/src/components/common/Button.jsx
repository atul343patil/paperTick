const Button = ({ children, className = "", ...props }) => (
	<button
		className={`rounded bg-sky-500 px-4 py-2 text-white ${className}`}
		{...props}
	>
		{children}
	</button>
);

export default Button;
