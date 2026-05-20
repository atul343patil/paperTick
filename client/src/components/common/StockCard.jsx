const StockCard = ({ symbol, price, change }) => (
	<div className="rounded border border-slate-200 bg-white p-4">
		<div className="text-sm text-slate-500">{symbol}</div>
		<div className="text-xl font-semibold text-slate-900">{price}</div>
		<div className={change >= 0 ? "text-green-600" : "text-red-600"}>
			{change}
		</div>
	</div>
);

export default StockCard;
