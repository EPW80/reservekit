const success = (data) => ({ data, error: null });

const error = (code, message) => ({ data: null, error: { code, message } });

module.exports = { success, error };
