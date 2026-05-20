import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useWebSocket = (url) => {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch({ type: "ws/connect", payload: url });
		return () => dispatch({ type: "ws/disconnect" });
	}, [dispatch, url]);
};

export default useWebSocket;
