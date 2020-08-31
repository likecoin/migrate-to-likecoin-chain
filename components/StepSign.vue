<template>
  <SigningForm
    v-if="!isSigning"
    class="mx-auto"
    :liker-id="likerId"
    :avatar="avatar"
    :is-civic-liker="isCivicLiker"
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
      <v-card-text>
        {{ $t('StepSign.description') }}
      </v-card-text>
      <v-card-text v-if="message">
        {{ message }}
      </v-card-text>
      <v-card-actions class="pt-0 pb-0">
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
      <v-card-actions
        v-if="!web3"
        class="pt-2"
      >
        <v-spacer />
        <v-btn
          class="caption"
          color="grey"
          text
          @click="onUseLedger"
        >
          {{ $t(`StepSign.button.use${useLedger ? 'MetaMask' : 'Ledger' }`) }}
        </v-btn>
      </v-card-actions>
    </template>
  </SigningForm>
  <metamask-dialog
    v-else-if="!useLedger"
    :is-loading="isLoading"
    :is-error="isError"
    @cancel="onCancel"
  >
    {{ message }}
  </metamask-dialog>
  <ledger-dialog
    v-else
    :is-loading="isLoading"
    :is-error="isError"
    :wait-for-confirm="false"
    @cancel="onCancel"
  >
    {{ message }}
  </ledger-dialog>
</template>
<script>
import * as eth from '../util/eth';
import {
  apiPostTransferMigration,
} from '../util/api';
import {
  getLedgerWeb3Engine,
} from '../util/ledger';

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
    likerId: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    isCivicLiker: {
      type: Boolean,
      default: false,
    },
    isLedger: {
      type: Boolean,
      required: true,
    },
    web3: {
      type: Object,
      default: () => null,
    },
  },
  data() {
    return {
      isSigning: false,
      message: '',
      isLoading: false,
      isError: false,
      isForceLedger: false,
    };
  },
  computed: {
    useLedger() {
      return this.isLedger || this.isForceLedger;
    },
    displayValue() {
      return (new BigNumber(this.value)).dividedBy(ONE_LIKE).toFixed();
    },
  },
  methods: {
    async onUseLedger() {
      try {
        this.isForceLedger = true;
        await this.onSend();
      } finally {
        this.isForceLedger = false;
      }
    },
    async onSend() {
      try {
        this.isSigning = true;
        if (!this.web3) {
          if (this.useLedger) {
            this.message = this.$t('StepSign.message.loadingLedger');
            eth.initWindowWeb3(await getLedgerWeb3Engine());
          } else {
            const provider = await eth.getWeb3Provider();
            if (!provider) throw new Error(this.$t('StepEthereum.message.noWeb3'));
            eth.initWindowWeb3(provider);
          }
        }
        const currentAddressList = await eth.getAddrList();
        if (!currentAddressList.includes(this.ethAddress)) {
          const maskedWallet = this.ethAddress.replace(/(0x.{4}).*(.{4})/, '$1...$2');
          throw new Error(this.$t('StepSign.message.addressNotMatch', { wallet: maskedWallet }));
        }
        if (this.useLedger) {
          this.message = this.$t('StepSign.message.signOnLedger');
        } else {
          this.message = this.$t('StepSign.message.signOnMetaMask');
        }
        await this.sendTransfer();
      } catch (err) {
        console.error(err);
        this.message = err;
        this.isSigning = false;
      }
    },
    async sendTransfer() {
      try {
        this.message = this.$t('StepSign.message.waitingForEthApp');
        const migrationData = await eth.signTransferMigration(this.ethAddress, this.value);
        migrationData.cosmosAddress = this.cosmosAddress;
        this.isLoading = true;
        const { data } = await apiPostTransferMigration(migrationData);
        this.message = '';
        this.$emit('confirm', data.txHash);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        this.message = err;
        this.isError = true;
      } finally {
        this.isLoading = false;
      }
    },
    onCancel() {
      this.message = '';
      this.isSigning = false;
      this.isLoading = false;
      this.isError = false;
    },
  },
};
</script>
