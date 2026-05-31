function json(res, statusCode, data) {
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');
	res.setHeader('Surrogate-Control', 'no-store');
	res.status(statusCode).json(data);
}

function methodNotAllowed(res, allowedMethods) {
	res.setHeader('Allow', allowedMethods.join(', '));
	return json(res, 405, {
		error: 'Method not allowed.',
	});
}

module.exports = {
	json,
	methodNotAllowed,
};
