/**
 * Runs once after all test suites.
 * Worker pg pools close when worker processes exit.
 * jest.config.js sets forceExit: true to handle any remaining open handles.
 */
module.exports = async () => {};
