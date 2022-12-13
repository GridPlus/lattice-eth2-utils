import { getPublicKey } from '@noble/bls12-381';
import {
  create as createKeystore,
  decrypt as decryptKeystore,
  verifyPassword,
  isValidKeystore,
} from '@chainsafe/bls-keystore';
import { deriveSeedTree } from 'bls12-381-keygen';
import { Constants as SDKConstants } from 'gridplus-sdk';
import { question } from 'readline-sync';
import { DepositData } from '../index';
import { buildPathStr, checkShouldRunTests, uint8arrayToHex } from './utils.test';

let encPw = process.env.ENC_PW;

describe('[Generate Deposit Data]', () => {
  beforeEach(() => {
    checkShouldRunTests();
  })

  it('Should validate size of vectors', async () => {
    expect(globals.vectors.depositData.blsWithdrawals.data.length)
    .to.equal(
      globals.vectors.depositData.eth1Withdrawals.data.length,
      "`blsWithdrawals` and `eth1Withdrawals` vectors must be the same length"
    );
  })

  it('Should get the device encryption password', async () => {
    // We need the device encryption password to export keystores
    if (!encPw) {
      encPw = await question('Enter your Lattice encryption password: ');
    }
  });

  // Run validation tests on provided vectors
  const N = globals.vectors.depositData.blsWithdrawals.data.length;
  for (let i = 0; i < N; i++) {
    describe(`[Deposit Data #${i+1}/${N}]`, () => {
      // Run tests
      it('Should validate BLS pubkey for validator', async () => {
        const pubs = await globals.client.getAddresses({
          startPath: getBlsPath(i),
          flag: SDKConstants.GET_ADDR_FLAGS.BLS12_381_G1_PUB,
        })
        expect(pubs[0].toString('hex')).toEqual(
          globals.vectors.depositData.blsWithdrawals.data[i].pubkey,
          () => { console.log('BLS pubkey does not match `blsWithdrawals` vector!!') }  
        )
        expect(pubs[0].toString('hex')).toEqual(
          globals.vectors.depositData.eth1Withdrawals.data[i].pubkey,
          'BLS pubkey does not match `eth1Withdrawals` vector'  
        );
      })

      it(`Should validate export of EIP2335-encoded keystore`, async () => {
        const encData = await DepositData.exportKeystore(globals.client, getBlsPath(i))
        await validateExportedKeystore(getBlsPath(i), encData);
      });

      it(`Should validate generated deposit data using BLS withdrawal`, async () => {
        await validateDepositData(
          getBlsPath(i), 
          JSON.stringify(globals.vectors.depositData.blsWithdrawals.data[i]),
        );
      });

      it(`Should validate generated deposit data using ETH1 withdrawal`, async () => {
        await validateDepositData(
          getBlsPath(i), 
          JSON.stringify(globals.vectors.depositData.eth1Withdrawals.data[i]),
          globals.vectors.depositData.eth1Withdrawals.eth1Addr
        );
      })

    });
  }
})

async function validateExportedKeystore(path: number[], encData: string) {
  const pathStr = buildPathStr(path);
  // Derive the private key from the global `seed` buffer, which we
  // assume matches the user's active Lattice seed.
  const privKey = deriveSeedTree(globals.seed, pathStr);

  // Validate the keystore according to EIP2335
  const keystore = JSON.parse(encData);
  expect(isValidKeystore(keystore)).toEqual(true);
  const keystorePwVerified = await verifyPassword(keystore, encPw);
  expect(keystorePwVerified).toBeTruthy();

  // Validate that the decrypted private key is correct
  const decrypted = await decryptKeystore(keystore, encPw);
  expect(uint8arrayToHex(decrypted)).toEqual(uint8arrayToHex(privKey));

  // Generate a keystore using reference utils and confirm it matches export
  // from the Lattice.
  const pubKey = getPublicKey(privKey);
  const refKeystore = await createKeystore(encPw, privKey, pubKey, pathStr);
  expect(isValidKeystore(refKeystore)).toBeTruthy();
  const refKeystorePwVerified = await verifyPassword(refKeystore, encPw);
  expect(refKeystorePwVerified).toBeTruthy();
  const refDecrypted = await decryptKeystore(refKeystore, encPw);
  expect(uint8arrayToHex(refDecrypted)).toEqual(uint8arrayToHex(privKey));
}

async function validateDepositData(path: number[], depositData: string, withdrawalKey: string=null) {
  const latticeData = await DepositData.generate(globals.client, path, { withdrawalKey });
  expect(latticeData).toEqual(depositData);
}

function getBlsPath(i) {
  return [12381, 3600, i, 0, 0];
}
