/**
 * Make sure hex string is converted to a buffer. Removes hex prefix if present.
 * Returns original `input` if it is already a Buffer.
 * @param input - String or Buffer
 */
export function ensureHexBuffer(input: string | Buffer): Buffer {
  if (typeof input === 'string') {
    return Buffer.from(input.slice(0, 2) === '0x' ? input.slice(2) : input, 'hex');
  } else if (Buffer.isBuffer(input)) {
    return input;
  } else {
    throw new Error('`input` must be a string or Buffer.');
  }
}