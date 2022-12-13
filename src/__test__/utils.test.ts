const HARDENED_OFFSET = 0x80000000

/**
 * Encode a set of BIP39 indices into a path string
*/
export const buildPathStr = (indices) => {
  let path = 'm'
  indices.forEach((idx) => {
    const dispIdx = idx >= HARDENED_OFFSET ? idx - HARDENED_OFFSET : idx;
    const dispHardened = idx >= HARDENED_OFFSET ? '\'' : '';
    path += `/${dispIdx}${dispHardened}`;
  })
  return path;
};

/**
 * Convert a Uint8Array type to a hex string
 */
export const uint8arrayToHex = (arr) => {
  return Buffer.from(arr).toString('hex');
};

export const checkShouldRunTests = () => {
  expect(globals.runTests).to.equal(
    true,
    'Skipping'
  )
};