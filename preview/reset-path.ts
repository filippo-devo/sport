// The single-file preview may be served from any path (an artifact URL, a file).
// Expo Router matches routes on location.pathname, so start the app at "/".
if (typeof window !== 'undefined' && window.location.pathname !== '/') {
  try {
    window.history.replaceState(window.history.state, '', '/');
  } catch {
    // Opaque origins (e.g. srcdoc) refuse; the router then shows its not-found screen.
  }
}
