interface BlsToExecutionOpts {
  // New ETH1 address that will be used in a new set of withdrawal
  // crednetials for this validator.
  eth1Addr: string,
  // Stateful validator index on the consensus chain network.
  // Must be accurate for message to be processed on the network.
  validatorIdx: number,
  // Network info (optional - defaults to mainnet genesis)
  networkInfo: NetworkInfo,
}

interface BlsToExecutionChange {
  // Stringified base 10 number representing validator index on the network
  validator_index: string,
  // 0x-prefixed hex string representing the original BLS withdrawal pubkey
  from_bls_pubkey: string,
  // 0x-prefixed hex string representing the new ETH1 withdrawal address
  to_execution_address: string,
}

interface SignedBlsToExecutionChange {
  // Execution change message
  message: BlsToExecutionChange,
  // 0x-prefixed hex string representing the BLS signature from the original
  // BLS withdrawal key on the execution change message
  signature: string,
}
