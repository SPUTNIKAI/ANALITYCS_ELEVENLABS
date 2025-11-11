const DEBUG = (process.env.DEBUG || 'false') === 'true';

function dbg(...args) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

module.exports = { dbg };


