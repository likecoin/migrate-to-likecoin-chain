<template>
  <div id="app">
    <template v-if="state === 'introduction'">
      <step-introduction @confirm="onStart" />
    </template>
    <template v-else-if="state === 'cosmos'">
      <step-cosmos @confirm="setCosmosAddress" />
    </template>
    <template v-else-if="state === 'eth'">
      <step-ethereum @confirm="setEthInformation" />
    </template>
    <template v-else-if="state === 'value'">
      <step-value-input
        :max-value="this.ethBalance"
        @confirm="setMigrateValue"
      />
    </template>
    <template v-else-if="state === 'sign'">
      <step-sign
        :eth-address="this.ethAddress"
        :cosmos-address="this.cosmosAddress"
        :value="this.migrateValue"
        :is-ledger="this.isLedger"
        @confirm="setTxHash"
      />
    </template>
    <template v-else-if="state === 'pending-tx'">
      <step-pending-tx
        :eth-address="this.ethAddress"
        :cosmos-address="this.cosmosAddress"
        :value="this.migrateValue"
        :processing-eth-tx-hash="this.processingEthTxHash"
        @reset="onReset"
        @done="onPostDone"
      />
    </template>
  </div>
</template>

<script>
import { trySetLocalStorage } from '../util/client';
import StepSign from '../components/StepSign.vue';
import StepPendingTx from '../components/StepPendingTx.vue';
import StepEthereum from '../components/StepEthereum.vue';
import StepValueInput from '../components/StepValueInput.vue';
import StepCosmos from '../components/StepCosmos.vue';
import StepIntroduction from '../components/StepIntroduction.vue';

export default {
  components: {
    StepSign,
    StepPendingTx,
    StepEthereum,
    StepValueInput,
    StepCosmos,
    StepIntroduction,
  },
  data: () => ({
    error: '',
    isBegin: false,
    cosmosAddress: '',
    web3: null,
    ethAddress: '',
    ethBalance: '',
    migrateValue: '',
    processingEthTxHash: '',
    isLedger: false,
  }),
  computed: {
    state() {
      if (this.processingEthTxHash) { // overide all states
        return 'pending-tx';
      } if (!this.isBegin) {
        return 'introduction';
      } if (!this.cosmosAddress) {
        return 'cosmos';
      } if (!this.ethAddress || !this.ethBalance || !this.web3) {
        return 'eth';
      } if (!this.migrateValue) {
        return 'value';
      } if (!this.processingEthTxHash) {
        return 'sign';
      }
      return 'introduction';
    },
  },
  mounted() {
    if (window.localStorage) {
      try {
        this.processingEthTxHash = window.localStorage.getItem('processingEthTxHash') || '';
        if (this.processingEthTxHash || this.processingCosmosTxHash) {
          this.cosmosAddress = window.localStorage.getItem('cosmosAddress') || '';
          this.ethAddress = window.localStorage.getItem('ethAddress') || '';
          this.migrateValue = window.localStorage.getItem('migrateValue') || '';
        }
      } catch (err) {
        // no op
      }
    }
  },
  methods: {
    onStart() {
      this.isBegin = true;
    },
    setCosmosAddress(cosmosAddress) {
      trySetLocalStorage('cosmosAddress', cosmosAddress);
      this.cosmosAddress = cosmosAddress;
    },
    setEthInformation({
      ethAddress,
      ethBalance,
      web3,
      isLedger,
    }) {
      trySetLocalStorage('ethAddress', ethAddress);
      this.ethAddress = ethAddress;
      this.web3 = web3;
      this.isLedger = isLedger;
      this.ethBalance = ethBalance;
    },
    setMigrateValue(migrateValue) {
      trySetLocalStorage('migrateValue', migrateValue);
      this.migrateValue = migrateValue;
    },
    setTxHash(txHash) {
      trySetLocalStorage('processingEthTxHash', txHash);
      this.processingEthTxHash = txHash;
    },
    async onReset() {
      this.onPostDone();
      this.isBegin = false;
      this.web3 = null;
      this.ethAddress = '';
      this.ethBalance = 0;
      this.cosmosAddress = '';
      this.migrateVale = 0;
      this.processingEthTxHash = '';
      this.processingCosmosTxHash = '';
    },
    async onPostDone() {
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
