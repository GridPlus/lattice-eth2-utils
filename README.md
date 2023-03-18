# 🛠️ lattice-eth2-utils
ETH2 utils for use with the Lattice1 hardware wallet and the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk). These utils are wrappers over core Lattice functionality and pertain to specific ETH2 actions, such as validator deposits.

Generally, these utils build messages to be signed by a BLS key and broadcast to Ethereum's consensus layer. All messages are constructed based on the reference [specification](https://github.com/ethereum/consensus-specs/tree/dev/specs). The following table lists all provided utils and their respective spec messages.

| Action | Reference | Description |
|:---|:---|:---|
| [`DepositData`](#generate-deposit-data) | [Phase0: `Deposit Data`](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositdata) | Build a deposit record to register a validator with the network. |


## Getting Started

> This repo is meant to be used in conjunction with the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk) repo. Please see [those docs](https://gridplus.github.io/gridplus-sdk/) to learn how to setup a `Client` instance.

Install with:

```
npm install --save lattice-eth2-utils
```

## `Deposit Data`

In order to start a new validator, you need to do two things:

1. Add an encrypted BLS private key (a.k.a. "keystore") to your consensus layer client so that it can make signatures for attestations/proposals using your new validator.
2. Generate deposit data and make an on-chain deposit to the [Ethereum Deposit Contract](https://etherscan.io/address/0x00000000219ab540356cbb839cbe05303d7705fa#code). This deposit must contain 32 ETH (the deposit) as well as the deposit data you generated.

### 1. Exporting Encrypted Keystores

Before doing the actual deposit, you should export the keystore associated with the validator you want to deposit into. This keystore contains the private key of your validator/deposit BLS key, encrypted according to [EIP2335](https://eips.ethereum.org/EIPS/eip-2335).

You can export a keystore from your Lattice's active wallet based on a validator path:

```ts
import { DepositData } from 'lattice-eth2-utils'

// Make sure you have a client setup
const client = //<instance of gridplus-sdk Client>

// Define the path using integers
const path = [ 12381, 3600, 0, 0, 0];

// Get the keystore. Note that by default we use a large number of iterations
// (defined in EIP2335) so the encrypted export takes about 30 seconds!
const keystore = await DepositData.exportKeystore(client, path);
```

Once you have your `keystore` data, you should save it to a JSON file and import it into your consensus layer client. Make sure the client processes the keystore and adds the correct pubkey before proceeding with the on-chain deposit. 

### 2. Generating Deposit Data

In order to start a new validator on the Ethereum consensus layer, you will need to sign and build a [`Deposit Data`](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositdata) record. The contents of this record need to be included in a call to the `deposit` function of the [Ethereum Deposit Contract](https://etherscan.io/address/0x00000000219ab540356cbb839cbe05303d7705fa#code) (i.e. on the *execution* layer).

There are two ways to use `lattice-eth2-utils` for generating deposit data:

- Export an ABI-encoded `calldata` string which can be added to any ETH execution layer transaction in order to make the deposit yourself.
- Export an object which can be JSON-serialized and used with the [Ethereum Launchpad](https://launchpad.ethereum.org). Note that this object can be arrayified and combined with other validators' deposit data for a better UX. You can, of course, always add one validator at a time.


#### A. Exporting Raw Transaction Calldata

> **NOTE:** If you use this option, please ensure you include the proper amount of ether in `msg.value`. *If you pass the wrong `msg.value`, your deposit transaction will fail!* By default, `DepositData` methods will use 32 ETH as the deposit amount, but you can always change it by setting your own `amountGwei` in `opts` (the third argument to `DepositData.generate` and `DepositData.generateObject`). As the name implies, this value must be in *Gwei*, not wei. 

If you are comfortable forming your own on-chain transactions, the easiest way to start a validator may be to use these utils to simply export transaction calldata. This can be done like so:

```ts
import { DepositData } from 'lattice-eth2-utils'

// Make sure you have a client setup
const client = //<instance of gridplus-sdk Client>

// Define the path using integers
const path = [ 12381, 3600, 0, 0, 0 ];

// Fetch JSON data, which can be arrayified and written to `deposit-data.json`
// There are two options:

// A. Generate deposit data with withdrawal credentials assigned to the
// BLS withdrawal key associated with the deposit key. The association
// is made based on the derivation path defined in EIP2334
const depositDataBlsWithdrawal = await DepositData.generate(client, path);

// B. Generate data with withdrawal credentials assigned to the specified
// ETH1 addreess by setting the `withdrawTo` option
const opts = {
  withdrawTo: '0x...', // My ETH1 address
};
const depositDataEth1Withdrawal = await DepositData.generate(client, path, opts);
```

The output will be something like:

```
0x228951180x000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001206a79ff9d44663a77897dcc35e6ba2db881023a781f524ed5933931464b857e3b0000000000000000000000000000000000000000000000000000000000000030835487e50af14d8167253cb55eba37b9ef1fae2ef965c7b7e1bea180cf1a7fcad816e2dee5d6bd4ff8865f6f4d0737e200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000605cd64817aac15cf07dfff83fd5d991de847bb5ea4c1742fdc9f24ac1c49b000000000000000000000000000000000000000000000000000000000000006085bbff3d41ad5d4883f150930df2d43888aad16456497b070d0c652af95de740fc722dbc869d0063f61f46b36ea0add31787a68a1f7df40108b91c152419bc60827b01459e32b817ac3d05d2716650bfc08355cd0651e70a08d6e30db2cc71d0
```

#### B. Exporting `deposit-data.json` Object

If you want to use the [Ethereum Launchpad](https://launchpad.ethereum.org), it is probably easier to use the `generateObject` option:

```ts
import { writeFileSync } from 'fs';

...

// Export JSON deposit data
const depositData = await DepositData.generateObject(client, path, opts);

// Arrayify all records prior to saving JSON file
const arrayifiedDepositData = [ depositData ]
writeFileSync('deposit-data.json', JSON.stringify(arrayifiedDepositData));
```

#### (Optional) Setting a Network Version (non-mainnet ONLY)

> **⚠️ You should skip this section if you are using ETH mainnet. Default network settings will always be valid for ETH mainnet deposits.**

In order to generate deposit data, we need to build a [`ForkData`](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#forkdata) object, which depends on the network and fork. By default, `DepositData.generate` will use the mainnet genesis version (which will always be valid for ETH mainnet deposits, even after future forks), but if you are using a different network, you can always change this by setting some `opts`:

```ts
import { Constants } from 'lattice-eth2-utils';

const opts = {
  networkName: 'myNetwork',
  forkVersion: Constants.NETWORKS.MAINNET_GENESIS.forkVersion,
  validatorsRoot: Constants.NETWORKS.MAINNET_GENESIS.validatorsRoot,
};

const data = await DepositData.generate(client, path, opts);
```

## Change Withdrawal Credentials

Because withdrawals happen on the execution layer, BLS keys cannot take receipt of funds. Therefore, withdrawal credentials must map to ETH1 (execution) addresses (i.e. use the `0x01` type credential) before a validator may withdraw. Some validators may have been setup with the `0x00` BLS withdrawal credential, which must be *upgraded* prior to withdrawing. **A validator's credentials may only be changed once.**

Changing the credentials is done by forming and broadcasting a [`SignedBLSToExecutionChange`](https://github.com/ethereum/consensus-specs/blob/dev/specs/capella/beacon-chain.md#signedblstoexecutionchange) payload, which can be done with these utils as follows:

```ts
import { BLSToExecutionChange } from 'lattice-eth2-utils`

// Make sure you have a client setup
const client = //<instance of gridplus-sdk Client>

// Define the path using integers
const blsWithdrawalPath = [ 12381, 3600, 0, 0 ];

// Define the options
const opts: BlsToExecutionOpts = {
  eth1Addr: '0x...', // Execution address that will be used in updated withdrawal credentials
  validatorIdx: 2837, // Network index of the validator whose credentials are being updated
  // Optional `networkInfo` may also be included
}

// Get a JSON object which can be written to a .json file and sent to your
// consensus client to execute the change
const changeJSON = await BLSToExecutionChange.generate(client, path, opts);
```

# 🧪 Testing

> **NOTE:** All tests are made against the **current active wallet** on your Lattice. If you have a SafeCard inserted and unlocked, that is the active wallet. Otherwise it is your Lattice wallet.

If you would like to get confidence around these utils before using them to do things on mainnet (a good idea!), you can run some tests.

## Setting Up

These tests are designed to run against production Lattice devices. Because production devices cannot export secret data like seeds, we need to make sure we configure the test suite properly or else your tests will fail.

### Config Params

By default the test suite will use `.env` for looking up config params. If you wish to use `.env`, you will need to create it -- you can see the format in `.env.template`.

Here are the config options you can define:

| Param | Description | Default Value |
|:---|:---|:---|
| `ENC_PW` | Your Lattice's device encryption password. You can set this on your Lattice by going to `System Preferences -> Security & Privacy -> Encryption Password`. | N/A |
| `DEVICE_ID` | Your Lattice's device ID. You can find this on your Lattice by going to `Device ID`. | N/A |
| `MNEMONIC` | String representing mnemonic seed phrase | `produce pool nurse odor pipe taxi next rebuild cram lamp bachelor power` |
| `CONNECT_URL` | Lattice routing endpoint. You should stick with the default unless you've set up routing infrastructure using [Lattice Connect](https://github.com/GridPlus/lattice-connect-v2) | `https://signing.gridpl.us`

### Defining Test Vectors

Before you run any tests, make sure your Lattice's active wallet is using a seed that matches the test vectors in `src/__test__/vectors.json`. If your seed does not match, all of the tests will fail.

To set this as your active wallet seed, is recommended you take a SafeCard you are not using, reset its seed (if necessary -- `Manage Wallets -> Reset SafeCard Wallet`), and load a mnemonic that matches `defaultMnemonic` in `vectors.json`. 

If you wish to use a different mnemonic (not recommended), you must set it as your `MNEMONIC` in `.env`. You will also need to make changes to `vectors.json`. Here is a list of vector values that need to be updated and how to do that:

| Vector | Source Description |
|:---|:---|
| `depositData.blsWithdrawals.data` | Output of [Ethereum Staking CLI](https://github.com/ethereum/staking-deposit-cli/releases/tag/v2.3.0) (`validator_keys/deposit-data-*.json`) running `./deposit existing-mnemonic` (no flags). Must match `*.eth1Withdrawals.data` in number of validators. |
| `depositData.eth1Withdrawals.eth1Addr` | ETH1 address. Can be any valid address. |
| `depositData.eth1Withdrawals.data` | Output of [Ethereum Staking CLI](https://github.com/ethereum/staking-deposit-cli/releases/tag/v2.3.0) (`validator_keys/deposit-data-*.json`) running `./deposit existing-mnemonic --eth1_withdrawal_address <depositData.eth1Withdrawals.eth1Addr>`. Must match `*.blsWithdrawals.data` in number of validators. | 
| `blsToExecutionChange.data` | Output of Ethereum Staking CLI running `./deposit generate-bls-to-execution-change --chain=mainnet --language=english --mnemonic="produce pool nurse odor pipe taxi next rebuild cram lamp bachelor power" --bls_withdrawal_credentials_list="0x00605cd64817aac15cf07dfff83fd5d991de847bb5ea4c1742fdc9f24ac1c49b" --validator_start_index=0 --validator_indices="18827" --execution_address="0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5"` for the first validator and similar commands for additional validators. |

## Running Tests

> **NOTE:** `node.js` v16 is suggested when running tests

You can run all tests with:

```
npm run test
```

This is a compositive of all test runners, which you can also run individually:

```
npm run test-deposit-data
npm run test-bls-credential-change
```