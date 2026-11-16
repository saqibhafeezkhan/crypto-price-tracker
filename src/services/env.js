// Provider credentials and base URLs are read on the API server, so this module
// reads process.env lazily. It is never bundled for the browser: the pages call
// /api instead, which also keeps the keys out of the client bundle.
export const readEnv = (key, fallback) => {
  const value = globalThis.process?.env?.[key];
  return value === undefined || value === '' ? fallback : value;
};
