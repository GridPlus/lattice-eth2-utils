/**
 * Utils for converting a validator's withdrawal credentials from BLS12-381
 * to an ETH1 address.
 */
import { ByteVectorType, ContainerType, UintNumberType, } from '@chainsafe/ssz';
import { Client, Constants as SDKConstants } from 'gridplus-sdk'
import { DOMAINS, NETWORKS } from './constants';
import { ensureHexBuffer, buildSigningRoot } from './utils';

/**
 * Set a new ETH1 address for a validator's withdrawal credentials.
 * This requires a signature.
 * @param client - Instance of GridPlus SDK, which is already connected/paired to a target Lattice.
 * @param path - Path of deposit/validator key. Array with up to five u32 indices representing BIP39 path.
 * @param opts - Instance of `BlsToExecutionOpts` containing params to change the withdrawal credentials.
 * @returns string containing the `SignedBLSToExecutionChange` message, which can be broadcast to a CL node.
 */
export async function generate(
  client: Client,
  path: number[],
  opts: BlsToExecutionOpts,
) : Promise<string> {
  // Setup options/params
  const {
    eth1Addr,
    validatorIdx,
    networkInfo=NETWORKS.MAINNET_GENESIS,
  } = opts;
  if (!eth1Addr) {
    throw new Error('No `eth1Addr` value found.');
  } else if (validatorIdx === undefined || validatorIdx === null) {
    throw new Error('No `validatorIdx` value found.');
  }
  // Convert eth1Addr to a Buffer
  const eth1AddrBuf = ensureHexBuffer(eth1Addr);

  // First get BLS withdrawal key from the Lattice
  const pubs = await client.getAddresses({ 
    startPath: path,
    flag: SDKConstants.GET_ADDR_FLAGS.BLS12_381_G1_PUB, 
  });
  const blsWithdrawalPub = ensureHexBuffer(pubs[0]);

  // Define the execution change type
  // https://github.com/ethereum/consensus-specs/blob/
  //  dev/specs/capella/beacon-chain.md#blstoexecutionchange
  const blsToExecutionChangeFields = {
    // ValidatorIndex defined in phase0 spec:
    // https://github.com/ethereum/consensus-specs/blob/
    //  dev/specs/phase0/beacon-chain.md#custom-types
    validator_index: new UintNumberType(8),
    from_bls_pubkey: new ByteVectorType(48),
    // ExecutionAddress defined in bellatrix spec:
    // https://github.com/ethereum/consensus-specs/blob/
    //  6181035d5ddef4b668d0fcfee460da9888009dd9/specs/bellatrix/beacon-chain.md#custom-types
    to_execution_address: new ByteVectorType(20),
  };
  const blsToExecutionChangeValues = {
    validator_index: validatorIdx,
    from_bls_pubkey: blsWithdrawalPub,
    to_execution_address: eth1AddrBuf,
  };
  const blsToExecutionChangeType = new ContainerType(blsToExecutionChangeFields);
  const blsToExecutionChangeRoot = Buffer.from(
    blsToExecutionChangeType.hashTreeRoot(blsToExecutionChangeValues)
  );

  // Get a signature on the execution change root
  const signReq = {
    data: {
      signerPath: path,
      curveType: SDKConstants.SIGNING.CURVES.BLS12_381_G2,
      hashType: SDKConstants.SIGNING.HASHES.NONE,
      // TODO: Change this if/when Lattice firmware adds the custom encoding type
      encodingType: SDKConstants.SIGNING.ENCODINGS.NONE,
      payload: buildSigningRoot(
        blsToExecutionChangeRoot, 
        DOMAINS.BLS_TO_EXECUTION_CHANGE, 
        networkInfo
      ),
      blsDst: SDKConstants.SIGNING.BLS_DST.BLS_DST_POP,
    }
  };
  const { sig } = await client.sign(signReq);
  // Return the signed execution change type
  // https://github.com/ethereum/consensus-specs/blob/
  //  dev/specs/capella/beacon-chain.md#signedblstoexecutionchange
  return JSON.stringify({
    message: {
      validator_index: `${validatorIdx}`,
      from_bls_pubkey: `0x${blsWithdrawalPub.toString('hex')}`,
      to_execution_address: `0x${eth1AddrBuf.toString('hex')}`,
    },
    signature: `0x${sig.toString('hex')}`,
  });
}