/** Tiny ID generator — no dependency needed */
export function nanoid(size = 10): string {
  return crypto.getRandomValues(new Uint8Array(size))
    .reduce((acc, byte) => acc + (byte & 15).toString(16), '')
}
