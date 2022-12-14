import { ByteVectorType, ContainerType, } from '@chainsafe/ssz';

/**
 * Make sure hex string is converted to a buffer. Removes hex prefix if present.
 * Returns original `input` if it is already a Buffer.
 * @param input - String or Buffer
 */
 export function ensureHexBuffer(input: string | Buffer): Buffer {
  if (typeof input === 'string') {
    return Buffer.from(input.slice(0, 2) === '0x' ? input.slice(2) : input, 'hex');
  } else if (Buffer.isBuffer(input)) {
    return input;
  } else {
    throw new Error('`input` must be a string or Buffer.');
  }
}

/**
 * Build a domain for making a signature. `ForkData` definition:
 * https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#forkdata
 * @param domainType - Type of domain. Should be one of the values in `DOMAINS` (constants.ts)
 * @param forkVersion - Network/fork version on which to build the message
 * @param validatorsRoot - Root of the validator set (at `forkVersion`) on which to build the message
 */
export function buildDomain(
  domainType: Buffer, 
  networkInfo: NetworkInfo,
): Buffer {
  const { forkVersion, validatorsRoot } = networkInfo;
  if (!forkVersion || forkVersion.length !== 4) {
    throw new Error('`forkVersion` must be a 4-byte Buffer.');
  } else if (!validatorsRoot || validatorsRoot.length !== 32) {
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
  const domain = Buffer.alloc(32);
  domainType.copy(domain, 0);
  forkDataRoot.slice(0, 28).copy(domain, 4);
  return domain;
}

/**
 * Build a signing root for a message. `SigningData` definition:
 * https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#signingdata
 * @param objectRoot - Root of the object being signed
 * @param domainType - Type of domain. Should be one of the values in `DOMAINS` (constants.ts)
 * @param forkVersion - Network/fork version on which to build the message
 * @param validatorsRoot - Root of the validator set (at `forkVersion`) on which to build the message
 */
export function buildSigningRoot(
  objectRoot: Buffer,
  domainType: Buffer,
  networkInfo: NetworkInfo,
): Buffer {
  if (objectRoot.length !== 32) {
    throw new Error('`objectRoot` must be a 32-byte Buffer.');
  }
  const signingType = new ContainerType({
    object_root: new ByteVectorType(32),
    domain: new ByteVectorType(32),
  });
  return Buffer.from(
    signingType.hashTreeRoot({
      object_root: objectRoot,
      domain: buildDomain(domainType, networkInfo),
    })
  );
}