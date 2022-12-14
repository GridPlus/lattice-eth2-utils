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

interface DepositData {
  // Deposit/validator BLS pubkey (included in deposit tx)
  pubkey: string;
  // 32 byte representing credentials (included in deposit tx)
  withdrawal_credentials: string;
  // Deposit amount in Gwei
  amount: number;
  // Signature over deposit_message_root
  signature: string;
  // hash_tree_root of DepositMessage:
  // https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositmessage
  deposit_message_root: string;
  // hash_tree_root of DepositData (included in deposit tx):
  // https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositdata
  deposit_data_root: string;
  // 4-byte `current_version` of `ForkData`:
  // https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#forkdata
  fork_version: string;
  // String capturing name of network. Just meant as a sanity check for Launchpad.
  network_name: string;
  // String capturing EF's staking CLI version. Just meant as a sanity check for Launchpad.
  deposit_cli_version: string;
}