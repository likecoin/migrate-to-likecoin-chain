<template>
  <div>
    <div v-if="error">
      {{ error }}
    </div>
    <div v-else-if="isDone">
      Done!
    </div>
    <div v-else-if="processingCosmosTxHash">
      Waiting for Cosmos Tx {{ processingCosmosTxHash }}...
      <a :href="cosmosTxLink" target="_blank">View on bigdipper</a>
    </div>
    <div v-else>
      Waiting for Eth Tx {{ processingEthTxHash }}...
      <a :href="ethTxLink" target="_blank">View on etherscan</a>
    </div>
    <div>
      <span>eth from</span>
      <span>{{ ethAddress }}</span>
    </div>
    <div>
      <span>cosmos to</span>
      <span>{{ cosmosAddress }}</span>
    </div>
    <div>
      <span>value</span>
      <span>{{ displayValue }}</span>
    </div>
    <button v-if="error" @click="$emit('reset')">
      Retry
    </button>
  </div>
</template>
<script>
import * as eth from '../util/eth';
import * as cosmos from '../util/cosmos';
import {
  ETHERSCAN_HOST,
  BIGDIPPER_HOST,
} from '../constant';
import {
  apiGetPendingCosmosMigration,
} from '../util/api';
import { timeout } from '../common/util/misc';

const BigNumber = require('bignumber.js');

const ONE_LIKE = new BigNumber(10).pow(18);
const ONE_COSMOS_LIKE = new BigNumber(10).pow(9);

export default {
  props: {
    ethAddress: {
      type: String,
      required: true,
    },
    cosmosAddress: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    processingEthTxHash: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isDone: false,
      error: '',
      resultValue: 0,
      processingCosmosTxHash: '',
    };
  },
  computed: {
    ethTxLink() {
      return `${ETHERSCAN_HOST}/tx/${this.processingEthTxHash}`;
    },
    cosmosTxLink() {
      return `${BIGDIPPER_HOST}/transactions/${this.processingCosmosTxHash}`;
    },
    displayValue() {
      if (this.resultValue) {
        return (new BigNumber(this.resultValue)).dividedBy(ONE_COSMOS_LIKE).toFixed();
      }
      return (new BigNumber(this.value)).dividedBy(ONE_LIKE).toFixed();
    },
  },
  mounted() {
    this.waitForEth();
  },
  methods: {
    async waitForEth() {
      this.state = 'eth';
      try {
        await eth.waitForTxToBeMined(this.processingEthTxHash);
        while (!this.processingCosmosTxHash) {
          /* eslint-disable no-await-in-loop */
          await timeout(10000);
          await this.updateCosmosProcessingTx();
          /* eslint-enable no-await-in-loop */
        }
        this.waitForCosmos();
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
    async updateCosmosProcessingTx() {
      const { data } = await apiGetPendingCosmosMigration(this.cosmosAddress);
      if (data && data.list && data.list.length) {
        const [targetTx] = data.list;
        this.processingCosmosTxHash = targetTx.txHash;
      }
    },
    async waitForCosmos() {
      this.state = 'cosmos';
      try {
        const tx = await cosmos.waitForTxToBeMined(this.processingCosmosTxHash);
        this.resultValue = tx.value.msg[0].value.amount[0].amount; // TODO: parse amount
        this.isDone = true;
        this.$emit('done');
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
  },
};
</script>
