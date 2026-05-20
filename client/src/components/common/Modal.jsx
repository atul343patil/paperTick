const Modal = ({ title, children, onClose }) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div className="w-full max-w-lg rounded bg-white p-6">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<button onClick={onClose} className="text-slate-500">
					Close
				</button>
			</div>
			<div className="mt-4">{children}</div>
		</div>
	</div>
);

export default Modal;
