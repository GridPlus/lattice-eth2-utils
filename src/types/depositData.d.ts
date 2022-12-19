interface DepositDataOpts {
  // If you would like to define a specific withdrawal key, you can use
  // this param. You must do this if, for example, you want to use an ETH1
  // address in the withdrawal credentials.
  // If nothing is passed here, the withdrawal credentials will be
  // generated automatically from the associated EIP2334 BLS key.
  withdrawTo?: string;
  // Amount to be deposited in GWei (10**9 wei)
  // [Default = 32 ETH]
  amountGwei?: number;
  // Information about the network fork. Sometimes specific values are
  // required to build certain consensus layer mesasages.
  // [Default = MAINNET_GENESIS]
  networkInfo?: NetworkInfo;
  // In order to be compatible with Ethereum's online launchpad, you need
  // to set a CLI version. This is associated with the Ethereum deposit CLI
  // and is just a dummy string in the context of our module.
  // [Default = "2.3.0"]
  depositCliVersion?: string;
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