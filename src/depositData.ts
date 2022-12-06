import { ByteVectorType, ContainerType, UintNumberType, } from '@chainsafe/ssz';
import { sha256 } from '@noble/hashes/sha256';
import { BN } from 'bn.js';
import { Constants as SDKConstants, Client } from 'gridplus-sdk';
import { DOMAINS, NETWORKS } from './constants';
import { ensureHexBuffer } from './utils';

/**
 * Generate ETH deposit data for a given validator.
 * This requires a secure connection with a Lattice via `client`.
 * A signing request will be made on the signing root, which is needed
 * before deposit data can be formed.
 * 
 * @param client - Instance of GridPlus SDK, which is already connected/paired to a target Lattice.
 * @param depositPath - Array with up to five u32 indices representing BIP39 path.
 * @param req - Instance of `EthDepositDataReq` containing params to build the deposit data.
 * @return JSON string containing deposit data for this validator.
 */
 export async function generate(
  client: Client,
  depositPath: number[],
  params: EthDepositDataReq
) : Promise<string> {
  const { 
    amountGwei=32000000000, 
    depositCliVersion='2.3.0',
    info=NETWORKS.MAINNET_GENESIS,
    withdrawalKey, 
  } = params;
  // Sanity checks
  // ---
  if (!depositPath || !amountGwei || !info || !depositCliVersion) {
    throw new Error(
      'One or more params missing from `req`: `depositPath`, `amountGwei`, `info`, `depositCliVersion`.'
    );
  }
  if (amountGwei < 0 || new BN(amountGwei).gte(new BN(2).pow(new BN(64)))) {
    throw new Error('`amountGwei` must be >0 and <UINT64_MAX')
  }
  const { networkName, forkVersion, validatorsRoot } = info;
  if (!networkName) {
    throw new Error('No `info.network` value found.');
  }
  if (!forkVersion) {
    throw new Error('No `info.forkVersion` value found.');
  } else if (forkVersion.length !== 4) {
    throw new Error('`info.forkVersion` must be a 4 byte Buffer.')
  }
  if (!validatorsRoot) {
    throw new Error('No `info.validatorsRoot` value found.');
  } else if (validatorsRoot.length !== 32) {
    throw new Error('`info.validatorsRoot` must be a 32 byte Buffer.');
  }
  // Start building data. Items should be strings. Some can be copied directly.
  // ---
  // Get the depositor pubkey
  const getAddrFlag = SDKConstants.GET_ADDR_FLAGS.BLS12_381_G1_PUB;
  const depositPubs = await client.getAddresses({ startPath: depositPath, flag: getAddrFlag });
  const depositKey = Buffer.from(depositPubs[0]);

  // If no withdrawalKey was passed, fetch the BLS one
  let withdrawalKeyBuf: Buffer;
  if (withdrawalKey) {
    // If a withdrawal key was provided, capture it here
    withdrawalKeyBuf = ensureHexBuffer(withdrawalKey);
  } else {
    // Otherwise we should derive the corresponding withdrawal key.
    // The withdrawal path is just up one derivation index relative to deposit path.
    // See: https://eips.ethereum.org/EIPS/eip-2334
    const withdrawalPath = depositPath.slice(0, depositPath.length-1);
    const withdrawalPubs = await client.getAddresses({ startPath: withdrawalPath, flag: getAddrFlag});
    withdrawalKeyBuf = Buffer.from(withdrawalPubs[0]);
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
  
  // Build the signing root
  // https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#compute_signing_root
  const signingType = new ContainerType({
    object_root: new ByteVectorType(32),
    domain: new ByteVectorType(32),
  });
  const signingRoot = Buffer.from(signingType.hashTreeRoot({
    object_root: depositMessageRoot,
    domain: getEthDepositDomain(forkVersion, validatorsRoot),
  }));
  // Sign the root
  const signReq = {
    data: {
      signerPath: depositPath,
      curveType: SDKConstants.SIGNING.CURVES.BLS12_381_G2,
      hashType: SDKConstants.SIGNING.HASHES.NONE,
      encodingType: SDKConstants.SIGNING.ENCODINGS.ETH_DEPOSIT,
      payload: signingRoot,
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
 * @internal
 * Generate domain data for an ETH deposit.
 * This is constructed out of a domain type (DEPOSIT) and a ForkData root.
 * 
 * ForkData definition:
 * https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#forkdata
 * 
 * @param forkVersion - A four byte version constant (default=00000000)
 * @return 32 byte Buffer containing domain data
 */
 function getEthDepositDomain(
  forkVersion: Buffer,
  validatorsRoot: Buffer,
): Buffer {
  if (forkVersion.length !== 4) {
    throw new Error('`forkVersion` must be a 4-byte Buffer.');
  } else if (validatorsRoot.length !== 32) {
    throw new Error('`validatorsRoot` must be a 32-byte Buffer.');
  }
  const forkDataType = new ContainerType({
    current_version: new ByteVectorType(4),
    genesis_validators_root: new ByteVectorType(32),
  });
  const forkDataRoot = Buffer.from(forkDataType.hashTreeRoot({
    current_version: forkVersion,
    genesis_validators_root: validatorsRoot,
  }));
  // Construct the domain, see:
  // https://github.com/ethereum/staking-deposit-cli/blob/
  // e2a7c942408f7fc446b889097f176238e4a10a76/staking_deposit/utils/ssz.py#L42
  const depositDomain = Buffer.alloc(32);
  DOMAINS.DEPOSIT.copy(depositDomain, 0);
  forkDataRoot.slice(0, 28).copy(depositDomain, 4);
  return depositDomain;
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