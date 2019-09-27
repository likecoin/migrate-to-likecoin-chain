<template>
  <div id="app">
    {{ state }}
    <div v-if="state === 'ready'">
      <div>
        Ethereum address: {{ ethAddr }}
        <button
          v-if="!ethAddr"
          @click="createWeb3"
        >
          Get Address
        </button>
      </div>
      <div>
        Ethereum balance: {{ ethBalance }}
      </div>
      <div>
        Cosmos address: <input v-model="cosmosAddr" size="60">
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
      <div>Migrated {{ valueToSend }}LIKE from {{ ethAddr }} to {{ cosmosAddr }}</div>
      <div><button @click="onReset">Back</button></div>
    </div>
  </div>
</template>

<script>
import Web3 from 'web3';
import * as eth from '../util/eth';
import * as cosmos from '../util/cosmos';
import {
  apiPostMigration,
  apiGetPendingEthMigration,
  apiGetPendingCosmosMigration,
  apiGetCosmosBalance,
} from '../util/api';
import {
  ETHERSCAN_HOST,
  BIGDIPPER_HOST,
} from '../constant';
import { timeout } from '../util/misc';

export default {
  data: () => ({
    state: 'ready',
    web3: null,
    ethAddr: null,
    ethBalance: '0',
    cosmosAddr: '',
    cosmosBalance: '0nanolike',
    valueToSend: '0',
    pendingEthTxs: [],
    pendingCosmosTx: [],
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
  watch: {
    async ethAddr(ethAddr) {
      this.getEthBalance();
      this.pendingEthTxs = await apiGetPendingEthMigration(ethAddr);
    },
    async cosmosAddr(cosmosAddr) {
      await this.getCosmosBalance();
      this.pendingCosmosTx = await apiGetPendingCosmosMigration(cosmosAddr);
    },
  },
  mounted() {
    if (window.localStorage) {
      try {
        window.localStorage.getItem('pendingEthTx');
        window.localStorage.getItem('pendingCosmosTx');
      } catch (err) {
        // no op
      }
    }
  },
  methods: {
    async createWeb3() {
      // TODO: check network
      let web3;
      if (window.ethereum) {
        await window.ethereum.enable();
        web3 = new Web3(window.ethereum);
      } if (window.web3) {
        web3 = new Web3(window.web3.currentProvider);
      }
      if (!web3) throw new Error('Cannot detect web3 from browser');
      eth.initWeb3(web3);
      this.web3 = web3;
      this.ethAddr = await eth.getFromAddr();
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
    async onSend() {
      const migrationData = await eth.signMigration(this.ethAddr, this.valueToSend);
      migrationData.cosmosAddress = this.cosmosAddr;
      const { data } = await apiPostMigration(migrationData);
      this.processingEthTxHash = data.txHash;
      this.waitForEth();
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
        const { data } = await apiGetPendingCosmosMigration(this.cosmosAddr);
        if (data && data.list && data.list.length) {
          const [targetTx] = data.list;
          this.processingCosmosTxHash = targetTx.txHash;
        }
        /* eslint-enable no-await-in-loop */
      }
      this.state = 'pendingCosmos';
      this.waitForCosmos();
    },
    async waitForCosmos() {
      await cosmos.waitForTxToBeMined(this.processingCosmosTxHash);
      this.state = 'done';
    },
  },
};
</script>
