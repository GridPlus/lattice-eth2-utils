import { getPublicKey } from '@noble/bls12-381';
import { mnemonicToSeedSync } from 'bip39';
import { deriveSeedTree } from 'bls12-381-keygen';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { Client, Constants as SDKConstants } from 'gridplus-sdk';
import { sha256 } from 'hash.js/lib/hash/sha';
import { jsonc } from 'jsonc';
import fetch from 'node-fetch';
import { question } from 'readline-sync';
import { buildPathStr } from './util';

dotenv.config()
const vectors = jsonc.parse(
  readFileSync(`${process.cwd()}/src/__test__/vectors.jsonc`).toString()
);
const defaultMnemonic = vectors.defaultMnemonic;

if (!globalThis.fetch) {
  // @ts-expect-error - fetch must be patched in a node environment
  globalThis.fetch = fetch
}

// Determine if the user set a mnemonic and use it if they did
let mnemonic;
if (process.env.MNEMONIC) {
  mnemonic = process.env.MNEMONIC;
} else {
  mnemonic = defaultMnemonic;
}

// Set the global test vectors
if (!vectors.depositData) {
  throw new Error('No `depositData` vector set. Aborting');
  process.exit(1);
}
globalThis.globals = {
  vectors: {
    depositData: vectors.depositData,
  }
}

// Set the global seed
const seed = mnemonicToSeedSync(mnemonic);
globalThis.globals.seed = seed;

// Setup an SDK instance
let deviceId = process.env.DEVICE_ID;
if (!deviceId) {
  deviceId = await question('Please enter your Lattice device ID: ');
}
const cfg = {
  name: 'lattice-eth2-utils test',
  baseUrl: process.env.CONNECT_URL || 'https://signing.gridpl.us',
  timeout: 120000,
};
// Create a re-usable privkey so that we can re-establish this connection
// for future test runs (as long as the user doesn't delete the permission)
cfg.privKey = sha256().update(deviceId).update(cfg.name).update(cfg.baseUrl).digest('hex');
// Instantiate the client and connect to the device
const client = new Client(cfg);
try {
  const isPaired = await client.connect(deviceId);
  if (!isPaired) {
    const secret = await question('Please enter the pairing secret: ');
    await client.pair(secret.toUpperCase());
    if (client.getActiveWallet() === undefined) {
      throw new Error('No active wallet on device.')
    }
  }
} catch (err) {
  throw new Error(err);
  process.exit(1);
}
globalThis.globals.client = client;

// Validate that the target Lattice's active wallet is using the correct seed.
// If it is not, then we should abort the test run by NOT setting `globals.runTests = true`.
const path = [ 12381, 3600, 0, 0, 0];
const pubs = await globals.client.getAddresses({
  startPath: path,
  flag: SDKConstants.GET_ADDR_FLAGS.BLS12_381_G1_PUB,
});
const priv = deriveSeedTree(seed, buildPathStr(path));
const pub = getPublicKey(priv);
if (pubs[0].toString('hex') !== Buffer.from(pub).toString('hex')) {
  const connectErr = "\x1b[31m⛔ Lattice exported incorrect public key.\n\n" +
    "Expected Lattice's current wallet to be setup from:\n↪️  " + mnemonic + "\n\n" +
    "Please see README for information on setting up tests. Aborting.";
  throw new Error(connectErr);
}
globals.runTests = true;
