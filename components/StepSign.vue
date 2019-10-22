<template>
  <SigningForm
    v-if="!isSigning"
    class="mx-auto"
    :eth-address="ethAddress"
    :cosmos-address="cosmosAddress"
    :value="displayValue"
  >
    <template #form-prepend>
      <v-card-title>
        {{ $t('StepSign.title') }}
      </v-card-title>
    </template>
    <template #form-append>
      <v-card-text v-if="message">
        {{ message }}
      </v-card-text>
      <v-card-actions class="pt-0 pb-4">
        <v-spacer />
        <v-btn
          color="secondary"
          outlined
          rounded
          @click="onSend"
        >
          <span class="primary--text px-2">{{ $t('StepSign.button.sign') }}</span>
        </v-btn>
        <v-spacer />
      </v-card-actions>
    </template>
  </SigningForm>
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
<script>
import * as eth from '../util/eth';
import {
  apiPostMigration,
  apiPostTransferMigration,
} from '../util/api';

import LedgerDialog from './LedgerDialog.vue';
import MetamaskDialog from './MetamaskDialog.vue';
import SigningForm from './SigningForm.vue';

const BigNumber = require('bignumber.js');

const ONE_LIKE = new BigNumber(10).pow(18);

export default {
  components: {
    LedgerDialog,
    MetamaskDialog,
    SigningForm,
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
          // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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
