<template>
  <div id="app">
    <div>{{ state }}: {{ isLedger ? 'ledger' : 'metamask' }}</div>
    <div v-if="state === 'ready'">
      <div>
        Ethereum address: {{ ethAddr }}
        <button
          @click="createWeb3"
        >
          Get MetaMask Address
        </button>
        <button
          @click="createWeb3Ledger"
        >
          Get Ledger
        </button>
      </div>
      <div>
        Ethereum balance: {{ ethBalance }}
      </div>
      <div>
        Cosmos address: <input v-model="cosmosAddr" size="60">
        <button
          @click="getCosmosAddressByLedger"
        >
          Get Ledger Cosmos Address
        </button>
      </div>
      <div>
        Cosmos balance: {{ cosmosBalance }}
      </div>
      <div>
        Amount: <input v-model="valueToSend" size="30">
        <button @click="onSend">
          Sign and send to cosmos
        </button>
      </div>
    </div>
    <div v-else-if="state === 'pendingEth'">
      <div>Waiting for eth tx {{ processingEthTxHash }}</div>
      <a target="_blank" :href="ethTxLink">{{ ethTxLink }}</a>
    </div>
    <div v-else-if="state === 'pendingCosmos'">
      <div>Waiting for cosmos tx {{ processingCosmosTxHash }}</div>
      <a target="_blank" :href="cosmosTxLink">{{ cosmosTxLink }}</a>
    </div>
    <div v-else-if="state === 'done'">
      <div>Migrated {{ resultValue }}LIKE from {{ ethAddr }} to {{ cosmosAddr }}</div>
      <div>
        <button @click="onReset">
          Back
        </button>
      </div>
    </div>
    <div v-if="error" style="color:red">error: {{ error }}</div>
  </div>
</template>

<script>
import * as eth from '../util/eth';
import * as cosmos from '../util/cosmos';
import {
  apiPostMigration,
  apiPostTransferMigration,
  apiGetPendingEthMigration,
  apiGetPendingCosmosMigration,
  apiGetCosmosBalance,
} from '../util/api';
import {
  ETHERSCAN_HOST,
  BIGDIPPER_HOST,
} from '../constant';
import {
  getLedgerWeb3Engine,
  getLedgerCosmosAddress,
} from '../util/ledger';
import { timeout } from '../util/misc';
import { trySetLocalStorage } from '../util/client';

export default {
  data: () => ({
    state: 'ready',
    error: '',
    isLedger: false,
    web3: null,
    ethAddr: null,
    ethBalance: '0',
    cosmosAddr: '',
    cosmosBalance: '0nanolike',
    valueToSend: '0',
    resultValue: '0',
    processingEthTxHash: '',
    processingCosmosTxHash: '',
  }),
  computed: {
    ethTxLink() {
      return `${ETHERSCAN_HOST}/tx/${this.processingEthTxHash}`;
    },
    cosmosTxLink() {
      return `${BIGDIPPER_HOST}/transactions/${this.processingCosmosTxHash}`;
    },
  },
  mounted() {
    if (window.localStorage) {
      try {
        this.processingEthTxHash = window.localStorage.getItem('processingEthTxHash') || '';
        this.processingCosmosTxHash = window.localStorage.getItem('processingCosmosTxHash') || '';
        if (this.processingEthTxHash || this.processingCosmosTxHash) {
          this.ethAddr = window.localStorage.getItem('ethAddr') || '';
          this.cosmosAddr = window.localStorage.getItem('cosmosAddr') || '';
        }
        this.refreshState();
      } catch (err) {
        // no op
      }
    }
  },
  methods: {
    async createWeb3() {
      try {
        // TODO: check network
        this.error = 'waiting for MetaMask';
        let web3;
        if (window.ethereum) {
          await window.ethereum.enable();
          web3 = eth.initWindowWeb3(window.ethereum);
        } if (window.web3) {
          web3 = eth.initWindowWeb3(window.web3.currentProvider);
        }
        if (!web3) throw new Error('Cannot detect web3 from browser');
        this.web3 = web3;
        this.updateEthAddr(await eth.getFromAddr());
        this.isLedger = false;
        this.error = '';
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
    async createWeb3Ledger() {
      try {
        this.error = 'waiting for ETH ledger App...';
        this.web3 = eth.initWindowWeb3(await getLedgerWeb3Engine());
        this.updateEthAddr(await eth.getFromAddr());
        this.isLedger = true;
        this.error = '';
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
    async getCosmosAddressByLedger() {
      try {
        this.error = 'waiting for Cosmos ledger App...';
        this.updateCosmosAdderr(await getLedgerCosmosAddress());
        this.error = '';
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
    async refreshState() {
      let state;
      if (this.processingEthTxHash) state = 'pendingEth';
      if (this.processingCosmosTxHash) state = 'pendingCosmos';
      switch (state) {
        case 'pendingEth': this.waitForEth(); break;
        case 'pendingCosmos': this.waitForCosmos(); break;
        default: break;
      }
    },
    async getEthBalance() {
      if (!this.web3) {
        await this.createWeb3();
      }
      this.ethBalance = await eth.getLikeCoinBalance(this.ethAddr);
      if (!this.valueToSend || this.valueToSend === '0') this.valueToSend = this.ethBalance;
    },
    async getCosmosBalance() {
      const { data } = await apiGetCosmosBalance(this.cosmosAddr);
      if (data.value !== undefined) this.cosmosBalance = data.value;
    },
    async updateEthAddr(ethAddr) {
      if (ethAddr) trySetLocalStorage('ethAddr', ethAddr);
      this.ethAddr = ethAddr;
      await this.getEthBalance();
      if (!this.processingEthTxHash) {
        await this.updateEthProcessingTx();
        this.refreshState();
      }
    },
    async updateCosmosAdderr(cosmosAddr) {
      if (cosmosAddr) trySetLocalStorage('cosmosAddr', cosmosAddr);
      this.cosmosAddr = cosmosAddr;
      await this.getCosmosBalance();
      if (!this.processingCosmosTxHash) {
        await this.updateCosmosProcessingTx({ checkPending: true });
        this.refreshState();
      }
    },
    async updateEthProcessingTx() {
      const { data } = await apiGetPendingEthMigration(this.ethAddr);
      if (data && data.list && data.list.length) {
        const [targetTx] = data.list;
        this.processingEthTxHash = targetTx.txHash;
        trySetLocalStorage('processingEthTxHash', this.processingEthTxHash);
      }
    },
    async updateCosmosProcessingTx({ checkPending = false } = {}) {
      const { data } = await apiGetPendingCosmosMigration(this.cosmosAddr);
      console.log(data);
      if (data && data.list && data.list.length) {
        const [targetTx] = data.list;
        if (checkPending && targetTx.status !== 'pending') return;
        this.processingCosmosTxHash = targetTx.txHash;
        trySetLocalStorage('processingCosmosTxHash', this.processingCosmosTxHash);
      }
    },
    async onSend() {
      if (this.isLedger) {
        this.sendTransfer();
      } else {
        this.sendMigrationTx();
      }
    },
    async sendMigrationTx() {
      try {
        this.error = 'waiting for Metamask ETH signature...';
        const migrationData = await eth.signMigration(this.ethAddr, this.valueToSend);
        migrationData.cosmosAddress = this.cosmosAddr;
        const { data } = await apiPostMigration(migrationData);
        this.processingEthTxHash = data.txHash;
        trySetLocalStorage('processingEthTxHash', this.processingEthTxHash);
        this.waitForEth();
        this.error = '';
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
    async sendTransfer() {
      try {
        this.error = 'waiting for ledger ETH signature...';
        const migrationData = await eth.signTransferMigration(this.ethAddr, this.valueToSend);
        migrationData.cosmosAddress = this.cosmosAddr;
        const { data } = await apiPostTransferMigration(migrationData);
        this.processingEthTxHash = data.txHash;
        trySetLocalStorage('processingEthTxHash', this.processingEthTxHash);
        this.waitForEth();
        this.error = '';
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
    async onReset() {
      this.getEthBalance();
      this.getCosmosBalance();
      this.state = 'ready';
    },
    async waitForEth() {
      this.state = 'pendingEth';
      await eth.waitForTxToBeMined(this.processingEthTxHash);
      while (!this.processingCosmosTxHash) {
        /* eslint-disable no-await-in-loop */
        await timeout(10000);
        await this.updateCosmosProcessingTx();
        /* eslint-enable no-await-in-loop */
      }
      this.waitForCosmos();
    },
    async waitForCosmos() {
      this.state = 'pendingCosmos';
      const tx = await cosmos.waitForTxToBeMined(this.processingCosmosTxHash);
      this.resultValue = tx.value.msg[0].value.amount.amount; // TODO: parse amount
      this.postDoneCleanUp();
    },
    async postDoneCleanUp() {
      this.state = 'done';
      if (window.localStorage) {
        try {
          window.localStorage.removeItem('processingEthTxHash');
          window.localStorage.removeItem('processingCosmosTxHash');
        } catch (err) {
          // no op
        }
      }
    },
  },
};
</script>
