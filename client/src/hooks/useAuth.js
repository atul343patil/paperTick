import { useSelector, useDispatch } from "react-redux";
import { logout, clearError } from "../store/slices/authSlice";

const useAuth = () => {
	const dispatch = useDispatch();
	const { user, token, isLoading, isAuthenticated, error } = useSelector(
		(state) => state.auth
	);

	return {
		user,
		token,
		isLoading,
		isAuthenticated,
		error,
		logout: () => dispatch(logout()),
		clearError: () => dispatch(clearError()),
	};
};

export default useAuth;
