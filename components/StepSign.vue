<template>
  <div>
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
      <span>{{ value }}</span>
    </div>
    <button @click="onSend">
      Sign
    </button>
    <div v-if="error">
      {{ error }}
    </div>
  </div>
</template>
<script>
import * as eth from '../util/eth';
import {
  apiPostMigration,
  apiPostTransferMigration,
} from '../util/api';

export default {
  props: {
    ethAddress: {
      type: String,
      required: true,
    },
    cosmosAddress: {
      type: Number,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    isLedger: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      error: '',
    };
  },
  methods: {
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
        const migrationData = await eth.signMigration(this.ethAddress, this.valueToSend);
        migrationData.cosmosAddress = this.cosmosAddress;
        const { data } = await apiPostMigration(migrationData);
        this.error = '';
        this.$emit('confirm', data.txHash);
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
    async sendTransfer() {
      try {
        this.error = 'waiting for ledger ETH signature...';
        const migrationData = await eth.signTransferMigration(this.ethAddress, this.valueToSend);
        migrationData.cosmosAddress = this.cosmosAddress;
        const { data } = await apiPostTransferMigration(migrationData);
        this.error = '';
        this.$emit('confirm', data.txHash);
      } catch (err) {
        console.error(err);
        this.error = err;
      }
    },
  },
};
</script>
