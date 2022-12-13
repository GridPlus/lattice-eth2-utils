# 🛠️ lattice-eth2-utils
ETH2 utils for use with the Lattice1 hardware wallet and the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk). These utils are wrappers over core Lattice functionality and pertain to specific ETH2 actions, such as validator deposits.

Generally, these utils build messages to be signed by a BLS key and broadcast to Ethereum's consensus layer. All messages are constructed based on the reference [specification](https://github.com/ethereum/consensus-specs/tree/dev/specs). The following table lists all provided utils and their respective spec messages.

| Action | Reference | Description |
|:---|:---|:---|
| [Generate Deposit Data](#generate-deposit-data) | [Phase0: `Deposit Data`](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositdata) | Build a deposit record to register a validator with the network. |


## Getting Started

> This repo is meant to be used in conjunction with the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk) repo. Please see [those docs](https://gridplus.github.io/gridplus-sdk/) to learn how to setup a `Client` instance.

Install with:

```
npm install --save lattice-eth2-utils
```

## Generate Deposit Data

In order to start a new validator on the Ethereum consensus layer, you will need to sign and broadcast a [`Deposit Data`](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositdata) record. This is needed so you can register ownership of your deposit key, which is Ethereum's way of [preventing rogue key attacks](https://hackmd.io/@benjaminion/bls12-381#Rogue-key-attacks). Note that "deposit key" and "validator key" refer to the same BLS key, whereas the withdrawal key is different and can either be a BLS key or an ETH1 key.

You can generate deposit data for a given validator index using a Lattice's current active wallet:

> NOTE: returned `data` will be a JSON-stringified struct containing deposit data for the validator in question. You may combine several of these in an array and JSON-stringify those items again to generate deposit data that can be consumed by, for example, the [Ethereum Launchpad](https://launchpad.ethereum.org/en/).

```ts
import { DepositData } from 'lattice-eth2-utils'

// Make sure you have a client setup
const client = //<instance of gridplus-sdk Client>

// Define the path using integers
const path = [ 12381, 3600, 0, 0, 0];

// Fetch JSON data, which can be arrayified and written to `deposit-data.json`
// There are two options:

// A. Generate deposit data with withdrawal credentials assigned to the
// BLS withdrawal key associated with the deposit key. The association
// is made based on the derivation path defined in EIP2334
const depositDataBlsWithdrawal = await DepositData.generate(client, path);

// B. Generate data with withdrawal credentials assigned to the specified
// ETH1 addreess by setting the `withdrawalKey` option
const opts = {
  withdrawalKey: '0x...', // My ETH1 address
};
const depositDataEth1Withdrawal = await DepositData.generate(client, path, opts);
```

**(Optional) Setting a Network Version (non-mainnet ONLY)**

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

## Running Tests

> **NOTE:** `node.js` v16 is suggested when running tests

You can run all tests with:

```
npm run test
```

This is a compositive of all test runners, which you can also run individually:

```
npm run test-deposit-data
```