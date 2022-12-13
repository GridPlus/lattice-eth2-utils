interface DepositDataOpts {
  // (optional) BLS withdrawal key or ETH1 withdrawal address
  withdrawalKey?: Buffer | string;
  // Amount to be deposited in GWei (10**9 wei)
  amountGwei: number;
  // Network info (optional - defaults to mainnet genesis)
  networkInfo: NetworkInfo;
  // In order to be compatible with Ethereum's online launchpad, you need
  // to set the CLI version. Obviously we are not using the CLI here but
  // we are following the protocol outlined in v2.3.0.
  depositCliVersion: string;
}