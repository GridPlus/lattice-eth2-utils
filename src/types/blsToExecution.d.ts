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
