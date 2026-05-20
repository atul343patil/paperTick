// Consistent error structure across the entire app
class ApiError extends Error {
	constructor(statusCode, message, errors = []) {
		super(message);
		this.statusCode = statusCode;
		this.message = message;
		this.errors = errors;
		this.success = false;
	}
}

module.exports = ApiError;
