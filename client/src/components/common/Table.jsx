const Table = ({ headers = [], rows = [] }) => (
	<div className="overflow-hidden rounded border border-slate-200 bg-white">
		<table className="w-full text-left text-sm">
			<thead className="bg-slate-100 text-slate-600">
				<tr>
					{headers.map((header) => (
						<th key={header} className="px-4 py-2 font-medium">
							{header}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row, index) => (
					<tr key={index} className="border-t border-slate-200">
						{row.map((cell, cellIndex) => (
							<td key={cellIndex} className="px-4 py-2">
								{cell}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	</div>
);

export default Table;
