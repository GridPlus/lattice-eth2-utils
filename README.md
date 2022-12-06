# lattice-eth2-utils
ETH2 utils for use with the Lattice1 hardware wallet and the `gridplus-sdk`. These utils are wrappers over core Lattice functionality and pertain to specific ETH2 actions, such as validator deposits.

More bundled actions may be added in the future, but can also be written by the discerning user using this repo as a template.

Pull requests are welcome!

## Getting Started

> This repo is meant to be used in conjunction with the [`gridplus-sdk`](https://github.com/GridPlus/gridplus-sdk) repo. Please see [those docs](https://gridplus.github.io/gridplus-sdk/) to learn how to setup a `Client` instance.

Install with:

```
npm install --save lattice-eth2-utils
```

## Deposit Data

You can generate deposit data for a given validator index using a Lattice's current active wallet:

```ts
import { DepositData } from 'lattice-eth2-utils'

// Make sure you have a client setup
const client = //<instance of gridplus-sdk Client>

// Define the path using integers
const path = [ 12381, 3600, 0, 0, 0];

// Fetch JSON data, which can be arrayified and written to `deposit-data.json`
const data = await DepositData.generate(client, path);
```

> NOTE: returned `data` will be a JSON-stringified struct containing deposit data for the validator in question. You may combine several of these in an array and JSON-stringify those items again to generate deposit data that can be consumed by, for example, the [Ethereum Launchpad](https://launchpad.ethereum.org/en/).

**Setting a Network Version**

By default, `DepositData.generate` will use the mainnet genesis version, but as more forks happen in the future this may change to the latest production network version. You can always change this by setting some `opts`:

```ts
import { Constants } from 'lattice-eth2-utils';

const opts = {
  networkName: 'myNetwork',
  forkVersion: Constants.NETWORKS.MAINNET_GENESIS.forkVersion,
  validatorsRoot: Constants.NETWORKS.MAINNET_GENESIS.validatorsRoot,
};

const data = await DepositData.generate(client, path, opts);
```