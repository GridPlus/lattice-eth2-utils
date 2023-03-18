import { getPublicKey } from '@noble/bls12-381';
import { deriveSeedTree } from 'bls12-381-keygen';
import { Constants as SDKConstants } from 'gridplus-sdk';
import { BLSToExecutionChange } from '../index';
import { getWithdrawalCredentials } from '../utils';
import { buildPathStr, checkShouldRunTests } from './utils.test';

describe('[Change Withdrawal Credentials]', () => {
  beforeEach(() => {
    checkShouldRunTests();
  })

  it('Should validate size of vectors', async () => {
    expect(globals.vectors.blsToExecutionChange.data.length)
    .to.be.above(
      0,
      "No `blsToExecutionChange` vectors found"
    );
  })

  // Run validation tests on provided vectors
  const N = globals.vectors.blsToExecutionChange.data.length;
  for (let i = 0; i < N; i++) {
    describe(`[Change Withdrawal Credential #${i+1}/${N}]`, () => {
      it('Should validate the BLS withdrawal pubkey', async () => {
        // Make sure exported key matches test vector
        // Get the BLS pubkey for the withdrawal key
        const pubs = await globals.client.getAddresses({
          startPath: getWithdrawalBlsPath(i),
          flag: SDKConstants.GET_ADDR_FLAGS.BLS12_381_G1_PUB,
        })
        // Convert to 0x00-type withdrawal credentials and check against test vector
        expect(getWithdrawalCredentials(pubs[0]).toString('hex')).toEqual(
          getWithdrawalCredentials(
            Buffer.from(
              globals.vectors.blsToExecutionChange.data[i].message.from_bls_pubkey.slice(2),
              'hex'
            )
          ).toString('hex'),
          'BLS pubkey does not match test vector!'  
        );
        // Make sure exported key matches reference derivation
        const derivedPriv = deriveSeedTree(
          globals.seed,
          buildPathStr(
            getWithdrawalBlsPath(i)
          )
        );
        const derivedPub = Buffer.from(
          getPublicKey(Buffer.from(derivedPriv).toString('hex')),
          'hex'
        ).toString('hex');
        expect(pubs[0].toString('hex')).toEqual(
          derivedPub,
          'Exported BLS pubkey does not match reference derivation!'
        );
      });

      it('Should change withdrawal credential', async () => {
        const signedMsg = await BLSToExecutionChange.generateObject(
          globals.client,
          getWithdrawalBlsPath(i),
          {
            eth1Addr: globals.vectors.blsToExecutionChange.newEth1Addr,
            validatorIdx: globals.vectors.blsToExecutionChange.validatorIndices[i],
          }
        );
        expect(JSON.stringify(signedMsg)).to.equal(
          JSON.stringify(globals.vectors.blsToExecutionChange.data[i]),
          "`SignedBLSToExecutionChange` payload does not match test vector"
        );
      });

    });
  }
})

function getWithdrawalBlsPath(i) {
  return [12381, 3600, i, 0];
}
