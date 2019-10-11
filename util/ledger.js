import createLedgerSubprovider from '@ledgerhq/web3-subprovider';
import TransportU2F from '@ledgerhq/hw-transport-u2f';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import ProviderEngine from 'web3-provider-engine';
import RpcSubprovider from 'web3-provider-engine/subproviders/rpc';
import Ledger from '@lunie/cosmos-ledger';

import { IS_TESTNET, ETH_ENDPOINT } from '../constant';

export function getLedgerWeb3Engine() {
  const engine = new ProviderEngine();
  const getTransport = () => {
    if (navigator.usb) return TransportWebUSB.create();
    return TransportU2F.create();
  };
  const ledger = createLedgerSubprovider(getTransport, {
    networkId: IS_TESTNET ? 4 : 1,
    accountsLength: 1,
  });
  engine.addProvider(ledger);
  engine.addProvider(new RpcSubprovider({ rpcUrl: ETH_ENDPOINT }));
  engine.start();
  return engine;
}

export async function getLedgerCosmosAddress() {
  const ledger = new Ledger({
    testModeAllowed: IS_TESTNET,
  });
  const address = await ledger.getCosmosAddress();
  return address;
}
