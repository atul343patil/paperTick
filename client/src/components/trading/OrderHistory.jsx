import { useSelector } from "react-redux";
import { formatINR } from "../../utils/formatters";
import Loader from "../common/Loader";

const OrderHistory = () => {
  const { orders, ordersLoading } = useSelector((s) => s.portfolio);

  if (ordersLoading) {
    return <div className="flex justify-center py-8"><Loader /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-textSecondary text-sm font-medium">No orders yet</p>
        <p className="text-textMuted text-xs mt-1">Your executed orders will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {["Time", "Stock", "Side", "Type", "Qty", "Price", "Total", "Charges", "Status"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-textMuted font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-b border-border/50 hover:bg-surfaceAlt transition-colors">
              <td className="px-4 py-3 text-textMuted whitespace-nowrap">
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  day: "2-digit", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-textPrimary">{order.symbol}</p>
                <p className="text-textMuted">{order.productType}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  order.side === "BUY"
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}>
                  {order.side}
                </span>
              </td>
              <td className="px-4 py-3 text-textSecondary">{order.orderType}</td>
              <td className="px-4 py-3 text-textPrimary">{order.quantity}</td>
              <td className="px-4 py-3 text-textPrimary">₹{order.executedPrice.toFixed(2)}</td>
              <td className="px-4 py-3 text-textSecondary">{formatINR(order.totalValue)}</td>
              <td className="px-4 py-3 text-warning">{formatINR(order.charges.totalCharges)}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                  {order.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderHistory;