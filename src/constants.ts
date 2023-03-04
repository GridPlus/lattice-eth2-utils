export const NETWORKS = {
  MAINNET_GENESIS: {
    networkName: 'mainnet',
    forkVersion: Buffer.alloc(4),
    // Validators root is fixed for the life of the chain. See reference:
    // https://eth2book.info/bellatrix/part3/containers/state/
    // And reference test:
    // https://github.com/ethereum/consensus-specs/blob/
    //  496e1d86c9e251a1b1d5b0eb785b0381ce553751/tests/core/pyspec/eth2spec/
    //  test/capella/block_processing/test_process_bls_to_execution_change.py#L231
    // NOTE: This is replaced with an empty buffer when generating deposit data.
    validatorsRoot: Buffer.from(
      '4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95',
      'hex'
    ),
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
