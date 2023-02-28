export const NETWORKS = {
  MAINNET_GENESIS: {
    networkName: 'mainnet',
    forkVersion: Buffer.alloc(4),
    // Empty root because there were no validators at genesis
    validatorsRoot: Buffer.alloc(32),
  },
};

export const DOMAINS = {
  BLS_TO_EXECUTION_CHANGE: Buffer.from('0A000000', 'hex'),
  DEPOSIT: Buffer.from('03000000', 'hex'),
};

export const ABIS = {
  DEPOSIT: [
    'bytes',  // BLS pubkey 
    'bytes',  // Withdrawal credentials
    'bytes',  // Signature on deposit data
    'bytes32' // Deposit data root
  ],
}
