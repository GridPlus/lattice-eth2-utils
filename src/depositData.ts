/**
 * Utils for preparing an ETH deposit for a new validator.
 * 
 * Methods:
 * - `generate`: Generate deposit data for a given validator. Requires signature.
 * - `exportKeystore`: Export an EIP2335 keystore for a given validator. 
 */
import { ByteVectorType, ContainerType, UintNumberType, } from '@chainsafe/ssz';
import { sha256 } from '@noble/hashes/sha256';
import { BN } from 'bn.js';
import { Constants as SDKConstants, Client } from 'gridplus-sdk';
import { DOMAINS, NETWORKS } from './constants';
import { ensureHexBuffer, buildSigningRoot } from './utils';
  
/**
 * Generate ETH deposit data for a given validator.
 * This requires a secure connection with a Lattice via `client`.
 * A signing request will be made on the signing root, which is needed
 * before deposit data can be formed.
 * 
 * @param client - Instance of GridPlus SDK, which is already connected/paired to a target Lattice.
 * @param path - Path of deposit/validator key. Array with up to five u32 indices representing BIP39 path.
 * @param opts - Instance of `DepositDataOpts` containing params to build the deposit data.
 * @return JSON string containing deposit data for this validator.
 */
export async function generate(
  client: Client,
  path: number[],
  opts: DepositDataOpts
) : Promise<string> {
  const { 
    amountGwei=32000000000, 
    depositCliVersion='2.3.0',
    networkInfo=NETWORKS.MAINNET_GENESIS,
    withdrawalKey, 
  } = opts;
  // Sanity checks
  // ---
  if (!path || !amountGwei || !networkInfo || !depositCliVersion) {
    throw new Error(
      'One or more params missing from `req`: `path`, `amountGwei`, `networkInfo`, `depositCliVersion`.'
    );
  }
  if (amountGwei < 0 || new BN(amountGwei).gte(new BN(2).pow(new BN(64)))) {
    throw new Error('`amountGwei` must be >0 and <UINT64_MAX')
  }
  const { networkName, forkVersion, validatorsRoot } = networkInfo;
  if (!networkName) {
    throw new Error('No `networkName` value found in `networkInfo`.');
  }
  if (!forkVersion) {
    throw new Error('No `forkVersion` value found in `networkInfo`.');
  } else if (forkVersion.length !== 4) {
    throw new Error('`forkVersion` must be a 4 byte Buffer.')
  }
  if (!validatorsRoot) {
    throw new Error('No `validatorsRoot` value found in `networkInfo`.');
  } else if (validatorsRoot.length !== 32) {
    throw new Error('`validatorsRoot` must be a 32 byte Buffer.');
  }
  // Start building data. Items should be strings. Some can be copied directly.
  // ---
  // Get the depositor pubkey
  const getAddrFlag = SDKConstants.GET_ADDR_FLAGS.BLS12_381_G1_PUB;
  const depositPubs = await client.getAddresses({ startPath: path, flag: getAddrFlag });
  const depositKey = ensureHexBuffer(depositPubs[0]);
 
  // If no withdrawalKey was passed, fetch the BLS one
  let withdrawalKeyBuf: Buffer;
  if (withdrawalKey) {
    // If a withdrawal key was provided, capture it here
    withdrawalKeyBuf = ensureHexBuffer(withdrawalKey);
  } else {
    // Otherwise we should derive the corresponding withdrawal key.
    // The withdrawal path is just up one derivation index relative to deposit path.
    // See: https://eips.ethereum.org/EIPS/eip-2334
    const withdrawalPath = path.slice(0, path.length-1);
    const withdrawalPubs = await client.getAddresses({ startPath: withdrawalPath, flag: getAddrFlag});
    withdrawalKeyBuf = ensureHexBuffer(withdrawalPubs[0]);
  }
  // We can now generate the withdrawal credentials
  const withdrawalCreds = getEthDepositWithdrawalCredentials(withdrawalKeyBuf);

  // Build the message root
  // https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositmessage
  const depositMessageType = new ContainerType({
    pubkey: new ByteVectorType(48),
    withdrawal_credentials: new ByteVectorType(32),
    amount: new UintNumberType(8),
  });
  const depositMessageRoot = Buffer.from(depositMessageType.hashTreeRoot({
    pubkey: depositKey,
    withdrawal_credentials: withdrawalCreds,
    amount: amountGwei,
  }));
  
  // Sign the data
  const signReq = {
    data: {
      signerPath: path,
      curveType: SDKConstants.SIGNING.CURVES.BLS12_381_G2,
      hashType: SDKConstants.SIGNING.HASHES.NONE,
      encodingType: SDKConstants.SIGNING.ENCODINGS.ETH_DEPOSIT,
      payload: buildSigningRoot(depositMessageRoot, DOMAINS.DEPOSIT, networkInfo),
      blsDst: SDKConstants.SIGNING.BLS_DST.BLS_DST_POP,
    }
  };
  const sig = await client.sign(signReq);
  if (sig.pubkey.toString('hex') !== depositKey.toString('hex')) {
    throw new Error('Incorrect signer returned. Deposit data generation failed.');
  }

  // Build the deposit data root
  // https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#depositdata
  const depositDataType = new ContainerType({
    pubkey: new ByteVectorType(48),
    withdrawal_credentials: new ByteVectorType(32),
    amount: new UintNumberType(8),
    signature: new ByteVectorType(96),
  });
  const depositDataRoot = Buffer.from(depositDataType.hashTreeRoot({
    pubkey: depositKey,
    withdrawal_credentials: withdrawalCreds,
    amount: amountGwei,
    signature: sig.sig,
  }));

  return JSON.stringify({
    pubkey: depositKey.toString('hex'),
    withdrawal_credentials: withdrawalCreds.toString('hex'),
    amount: amountGwei,
    signature: sig.sig.toString('hex'),
    deposit_message_root: depositMessageRoot.toString('hex'),
    deposit_data_root: depositDataRoot.toString('hex'),
    fork_version: forkVersion.toString('hex'),
    network_name: networkName,
    deposit_cli_version: depositCliVersion,
  });
}
 
/**
 * Export an encrypted keystore (private key) from the Lattice's active wallet.
 * The keystore is formatted according to EIP2335.
 * @param client - An instance of the `gridplus-sdk` `Client`
 * @param path - Path for deposit/validator key. Array with up to five u32 indices representing BIP39 path.
 * @param c - The PBKDF2 iteration count (default=262144)
 * @return - JSON-stringified encrypted keystore
 */
export async function exportKeystore(
  client: Client,
  path: number[],
  c = 262144, // Default comes from EIP2335 example
): Promise<string> {
  const req = {
    schema: SDKConstants.ENC_DATA.SCHEMAS.BLS_KEYSTORE_EIP2335_PBKDF_V4,
    params: {
      path: path,
      c,
    }
  };
  const encData = await client.fetchEncryptedData(req);
  return JSON.stringify(JSON.parse(encData.toString()));
}
 
/**
 * @internal
 * Get the withdrawal credentials given a key.
 * There are currently two supported types of withdrawal:
 * - 0x00: BLS key used to withdraw
 * - 0x11: ETH1 key used to withdraw
 * 
 * @param withdrawalKey - Buffer containing either BLS withdrawal pubkey (48 bytes)
 *                        or Ethereum address (20 bytes)
 * @return 32-byte Buffer containing withdrawal credentials
 */
function getEthDepositWithdrawalCredentials(
  withdrawalKey: Buffer, // BLS pubkey of mapped withdrawal key OR ETH1 address
): Buffer {
  const creds = Buffer.alloc(32);
  const keyBuf =  ensureHexBuffer(withdrawalKey);
  if (keyBuf.length === 48) {
    // BLS key - must be hashed first
    creds[0] = 0;
    Buffer.from(sha256(keyBuf)).slice(1).copy(creds, 1);
  } else if (keyBuf.length === 20) {
    // ETH1 key - added raw to buffer, left padded
    creds[0] = 1;
    keyBuf.copy(creds, 12);
  } else {
    throw new Error('`withdrawalKey` must be 48 byte BLS pubkey or Ethereum address.');
  }
  return creds;
}
