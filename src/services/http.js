export const REQUEST_TIMEOUT_MS = 6000;

// A blocked or very slow host must not leave a page on "loading" forever. The
// caller's abort signal still wins so navigating away stays instant.
const withTimeout = (signal, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  const forwardAbort = () => {
    controller.abort(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
  };

  if (signal) {
    if (signal.aborted) forwardAbort();
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }

  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    },
  };
};

export const requestJson = async (
  url,
  { signal, headers = {}, timeoutMs = REQUEST_TIMEOUT_MS, label = 'Request' } = {},
) => {
  const timeout = withTimeout(signal, timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', ...headers },
      signal: timeout.signal,
    });

    if (!response.ok) {
      // The status travels with the error so callers can tell a rate limit apart
      // from a real failure and back off instead of dropping the data.
      const error = new Error(`${label} failed: ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } finally {
    timeout.done();
  }
};
