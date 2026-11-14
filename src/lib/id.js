/** A unique id for "this click", so a double click or retry is recognised by the server. Works on plain http too. */
export function newRequestId() {
  if (globalThis.crypto?.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* not a secure page */ }
  }
  const rnd = globalThis.crypto?.getRandomValues ? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('') : `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  return `${Date.now().toString(16)}-${rnd}`;
}
