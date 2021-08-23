/* eslint-disable max-len */
/* eslint-disable prefer-template */
import { CHAIN_ID } from '../constant';
import { timeout } from './misc';

class Keplr {
  constructor() {
    this.offlineSigner = null;
    this.accounts = [];
    this.inited = false;
  }

  async initKeplr() {
    if (this.inited) return true;
    if (!window.keplr) {
      let tries = 0;
      const TRY_COUNT = 3;
      while (TRY_COUNT > tries) {
        // eslint-disable-next-line no-await-in-loop
        await timeout(1000);
        tries += 1;
      }
    }
    if (window.keplr) {
      try {
        await window.keplr.enable(CHAIN_ID);

        const offlineSigner = window.getOfflineSigner(CHAIN_ID);
        this.signer = offlineSigner;
        this.accounts = await offlineSigner.getAccounts();
        this.inited = true;
        return true;
      } catch (error) {
        console.error(error);
      }
    }
    return false;
  }

  async checkIfInited() {
    if (!this.inited) {
      const res = await this.initKeplr();
      if (!res) throw new Error('CANNOT_INIT_KEPLR');
    }
  }

  internalGetWalletAddress() {
    const [wallet = {}] = this.accounts;
    return wallet.address;
  }

  async getWalletAddress() {
    await this.checkIfInited();
    const address = this.internalGetWalletAddress();
    return address;
  }
}

export default new Keplr();
