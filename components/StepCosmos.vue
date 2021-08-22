<template>
  <v-card
    v-if="!showLedger"
    outlined
  >
    <v-card flat>
      <v-card-text>
        {{ $t('StepCosmos.cosmosAddress') }}
      </v-card-text>
      <v-form @submit.prevent="submitCosmosAddress">
        <v-card-text class="py-0">
          <v-text-field
            v-model="cosmosAddress"
            class="caption"
            :error-messages="error"
            placeholder="e.g. cosmos1234567890abcdefghijklmnopqrstuvwxyz123"
            outlined
            solo
            flat
            required
          />
        </v-card-text>
        <v-card-actions class="pt-0 pb-4">
          <v-spacer />
          <v-btn
            :disabled="!cosmosAddress"
            color="secondary"
            type="submit"
            outlined
            rounded
          >
            <span
              :class="{ 'primary--text': !!cosmosAddress, 'px-2': true }"
            >{{ $t('StepCosmos.button.continue' ) }}</span>
          </v-btn>
          <v-spacer />
        </v-card-actions>
      </v-form>
    </v-card>
    <v-divider class="mt-2" />
    <div class="mt-n2 d-flex justify-center">
      <span class="d-inline-block overline grey--text white px-2">{{ $t('General.or') }}</span>
    </div>
    <v-card class="ma-4">
      <v-list-item
        class="grey lighten-5"
        @click="onClickUseLedger"
      >
        <img
          class="ml-n3 mr-3"
          src="~/assets/images/ledger-nano-s.svg"
          width="108px"
        >
        <v-list-item-content>
          <v-list-item-title class="primary--text font-weight-bold">
            {{ $t('General.button.connectLedger' ) }}
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <v-icon color="secondary">
            mdi-arrow-right
          </v-icon>
        </v-list-item-action>
      </v-list-item>
    </v-card>
    <v-card class="ma-4">
      <v-list-item
        class="grey lighten-5"
        @click="onClickUseKeplr"
      >
        <img
          class="ml-n3 mr-3"
          src="~/assets/images/keplr.svg"
          width="108px"
        >
        <v-list-item-content>
          <v-list-item-title class="primary--text font-weight-bold">
            {{ $t('General.button.connectKeplr' ) }}
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action>
          <v-icon color="secondary">
            mdi-arrow-right
          </v-icon>
        </v-list-item-action>
      </v-list-item>
    </v-card>
  </v-card>
  <ledger-dialog
    v-else
    type="cosmos"
    :is-error="isLedgerError"
    @cancel="onCancelLedger"
    @confirm="onConfirmLedger"
  >
    {{ ledgerMessage }}
  </ledger-dialog>
</template>

<script>
import {
  getLedgerCosmosAddress,
} from '../util/ledger';
import LedgerDialog from './LedgerDialog.vue';
import Keplr from '../util/Keplr';

function isValidCosmosWallet(str) {
  return !!str.match(/^cosmos1[ac-hj-np-z02-9]{38}$/);
}

export default {
  components: {
    LedgerDialog,
  },
  data() {
    return {
      error: '',
      showLedger: false,
      isConnectingLedger: false,
      ledgerMessage: '',
      cosmosAddress: '',
      isLedgerError: false,
    };
  },
  methods: {
    onClickUseLedger() {
      this.showLedger = true;
    },
    async onClickUseKeplr() {
      await Keplr.initKeplr();
      this.cosmosAddress = await Keplr.getWalletAddress();
      this.submitCosmosAddress();
    },
    onCancelLedger() {
      this.showLedger = false;
      this.isLedgerError = false;
      this.ledgerMessage = '';
    },
    onConfirmLedger() {
      this.isLedgerError = false;
      this.ledgerMessage = this.$t('StepCosmos.message.waitingForCosmosApp');
      this.getCosmosAddressByLedger();
    },
    async getCosmosAddressByLedger() {
      try {
        this.cosmosAddress = await getLedgerCosmosAddress();
        this.ledgerMessage = '';
        this.submitCosmosAddress();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        this.ledgerMessage = err;
        this.isLedgerError = true;
      }
    },
    async submitCosmosAddress() {
      this.cosmosAddress = this.cosmosAddress.trim();
      this.error = '';
      if (!isValidCosmosWallet(this.cosmosAddress)) {
        this.error = this.$t('StepCosmos.message.invalidCosmosAddress');
      } else {
        this.$emit('confirm', this.cosmosAddress);
      }
    },
  },
};
</script>
