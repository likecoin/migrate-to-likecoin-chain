<template>
  <div id="app">
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
      <button @click="send">
        Sign and send to cosmos
      </button>
    </div>
  </div>
</template>

<script>
import Web3 from 'web3';
import * as eth from '../util/eth';
import {
  apiPostMigration,
  apiGetPendingMigration,
  apiGetCosmosBalance,
} from '../util/api';

export default {
  data: () => ({
    web3: null,
    ethAddr: null,
    ethBalance: '0',
    cosmosAddr: '',
    cosmosBalance: '0nanolike',
    valueToSend: '0',
  }),
  watch: {
    async ethAddr(ethAddr) {
      this.getEthBalance();
      this.pendingEthTx = await apiGetPendingMigration(ethAddr);
    },
    async cosmosAddr() {
      await this.getCosmosBalance();
    },
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
    },
    async getCosmosBalance() {
      const { data } = await apiGetCosmosBalance(this.cosmosAddr);
      if (data.value !== undefined) this.cosmosBalance = data.value;
    },
    async send() {
      const migrationData = await eth.signMigration(this.ethAddr, this.valueToSend);
      migrationData.cosmosAddress = this.cosmosAddr;
      console.log(migrationData);
      await apiPostMigration(migrationData);
    },
  },
};
</script>
