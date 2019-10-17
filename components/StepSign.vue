<template>
  <div v-if="!isSigning">
    <div>
      <span>{{ $t('Common.ethFrom') }}</span>
      <span>{{ ethAddress }}</span>
    </div>
    <div>
      <span>{{ $t('Common.cosmosTo') }}</span>
      <span>{{ cosmosAddress }}</span>
    </div>
    <div>
      <span>{{ $t('Common.value') }}</span>
      <span>{{ displayValue }}</span>
    </div>
    <button @click="onSend">
      {{ $t('StepSign.button.sign') }}
    </button>
    <div v-if="message">
      {{ message }}
    </div>
  </div>
  <div v-else>
    <div v-if="!isLedger">
      <metamask-dialog
        @cancel="onCancel"
      >
        {{ message }}
      </metamask-dialog>
    </div>
    <div v-else>
      <ledger-dialog
        :wait-for-confirm="false"
        @cancel="onCancel"
      >
        {{ message }}
      </ledger-dialog>
    </div>
  </div>
</template>
<script>
import * as eth from '../util/eth';
import {
  apiPostMigration,
  apiPostTransferMigration,
} from '../util/api';
import LedgerDialog from './LedgerDialog.vue';
import MetamaskDialog from './MetamaskDialog.vue';

const BigNumber = require('bignumber.js');

const ONE_LIKE = new BigNumber(10).pow(18);

export default {
  components: {
    LedgerDialog,
    MetamaskDialog,
  },
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
    isLedger: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      isSigning: false,
      message: '',
    };
  },
  computed: {
    displayValue() {
      return (new BigNumber(this.value)).dividedBy(ONE_LIKE).toFixed();
    },
  },
  methods: {
    async onSend() {
      this.isSigning = true;
      if (this.isLedger) {
        this.sendTransfer();
      } else {
        this.sendMigrationTx();
      }
    },
    async sendMigrationTx() {
      try {
        this.message = this.$t('StepSign.message.waitingForMetamask');
        const migrationData = await eth.signMigration(this.ethAddress, this.value);
        migrationData.cosmosAddress = this.cosmosAddress;
        const { data } = await apiPostMigration(migrationData);
        this.message = '';
        this.$emit('confirm', data.txHash);
      } catch (err) {
        console.error(err);
        this.message = err;
      }
    },
    async sendTransfer() {
      try {
        this.message = this.$t('StepSign.message.waitingForEthApp');
        const migrationData = await eth.signTransferMigration(this.ethAddress, this.value);
        migrationData.cosmosAddress = this.cosmosAddress;
        const { data } = await apiPostTransferMigration(migrationData);
        this.message = '';
        this.$emit('confirm', data.txHash);
      } catch (err) {
        console.error(err);
        this.message = err;
      }
    },
    onCancel() {
      this.isSigning = false;
    },
  },
};
</script>
