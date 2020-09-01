import createLedgerSubprovider from '@ledgerhq/web3-subprovider';
import TransportU2F from '@ledgerhq/hw-transport-u2f';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import ProviderEngine from 'web3-provider-engine';
import RpcSubprovider from 'web3-provider-engine/subproviders/rpc';
import CosmosApp from 'ledger-cosmos-js';
import sha256 from 'crypto-js/sha256';
import ripemd160 from 'crypto-js/ripemd160';
import CryptoJS from 'crypto-js';
import bech32 from 'bech32';

import { IS_TESTNET, ETH_ENDPOINT } from '../constant';

export function getLedgerWeb3Engine({ isLegacy = true, offset = 0 } = {}) {
  const engine = new ProviderEngine();
  const getTransport = () => {
    if (navigator.usb) return TransportWebUSB.create();
    return TransportU2F.create();
  };
  const ledger = createLedgerSubprovider(getTransport, {
    networkId: IS_TESTNET ? 4 : 1,
    path: isLegacy ? "44'/60'/0'/0" : "44'/60'/0'/0/0",
    accountsOffset: offset,
    accountsLength: 5,
  });
  engine.addProvider(ledger);
  engine.addProvider(new RpcSubprovider({ rpcUrl: ETH_ENDPOINT }));
  engine.start();
  return engine;
}

export async function getLedgerCosmosAddress(hdpath = [44, 118, 0, 0, 0]) {
  const transport = await TransportWebUSB.create();
  const cosmosLedgerApp = new CosmosApp(transport);
  const pubKeyRes = await cosmosLedgerApp.publicKey(hdpath);
  const message = CryptoJS.enc.Hex.parse(pubKeyRes.compressed_pk.toString('hex'));
  const hash = ripemd160(sha256(message)).toString();
  const addressRawHex = Buffer.from(hash, 'hex');
  const words = bech32.toWords(addressRawHex);
  const address = bech32.encode('cosmos', words);
  return address;
}
