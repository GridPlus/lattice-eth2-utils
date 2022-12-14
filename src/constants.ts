export const NETWORKS = {
  MAINNET_GENESIS: {
    networkName: 'mainnet',
    forkVersion: Buffer.alloc(4),
    // Empty root because there were no validators at genesis
    validatorsRoot: Buffer.alloc(32),
  },
};

export const DOMAINS = {
  BLS_TO_EXECUTION_CHANGE: Buffer.from('0x0A000000', 'hex'),
  DEPOSIT: Buffer.from('03000000', 'hex'),
  VOLUNTARY_EXIT: Buffer.from('04000000', 'hex'),
};