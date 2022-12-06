export const ETH2_CONSTANTS = {
  NETWORKS: {
    MAINNET_GENESIS: {
      networkName: 'mainnet',
      forkVersion: Buffer.alloc(4),
      // Empty root because there were no validators at genesis
      validatorsRoot: Buffer.alloc(32),
    },
  },
  DOMAINS: {
    DEPOSIT: Buffer.from('03000000', 'hex'),
    VOLUNTARY_EXIT: Buffer.from('04000000', 'hex'),
  }
}