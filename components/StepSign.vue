<template>
  <v-card
    v-if="!isSigning"
    outlined
  >
    <v-card-title>{{ $t('StepSign.title') }}</v-card-title>
    <v-card-text class="pb-0">
      <v-text-field
        class="caption"
        :label="$t('Common.ethFrom')"
        :value="ethAddress"
        outlined
        flat
        dense
        readonly
      />
      <v-text-field
        class="caption"
        :label="$t('Common.cosmosTo')"
        :value="cosmosAddress"
        outlined
        flat
        dense
        readonly
      />
      <v-text-field
        class="headline"
        :label="$t('Common.value')"
        :value="displayValue"
        outlined
        flat
        readonly
      />
    </v-card-text>
    <v-card-text v-if="message">{{ message }}</v-card-text>
    <v-card-actions class="pt-0">
      <v-spacer />
      <v-btn
        class="primary--text"
        text
        @click="onSend"
      >{{ $t('StepSign.button.sign') }}</v-btn>
    </v-card-actions>
  </v-card>
  <metamask-dialog
    v-else-if="!isLedger"
    :is-loading="isLoading"
    @cancel="onCancel"
  >
    {{ message }}
  </metamask-dialog>
  <ledger-dialog
    v-else
    :wait-for-confirm="false"
    @cancel="onCancel"
  >
    {{ message }}
  </ledger-dialog>
  </template>
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
      isLoading: false,
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
        this.isLoading = true;
        const { data } = await apiPostMigration(migrationData);
        this.message = '';
        this.$emit('confirm', data.txHash);
      } catch (err) {
        if (err.code === -32603) {
          // User rejected signing
          this.onCancel();
        } else {
          console.error(err);
          this.message = err;
        }
      } finally {
        this.isLoading = false;
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
      this.message = '';
      this.isSigning = false;
      this.isLoading = false;
    },
  },
};
</script>
