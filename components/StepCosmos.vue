<template>
  <v-card
    v-if="!showLedger"
    outlined
  >
    <v-card flat>
      <v-form @submit.prevent="submitCosmosAddress">
        <v-card-text>
          <v-text-field
            class="caption"
            v-model="cosmosAddress"
            :error-messages="error"
            :label="$t('StepCosmos.cosmosAddress')"
            required
          />
        </v-card-text>
        <v-card-actions class="pt-0">
          <v-spacer />
          <v-btn
            :disabled="!cosmosAddress"
            color="primary"
            type="submit"
            text
          >{{ $t('StepCosmos.button.continue' ) }}</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
    <v-divider />
    <v-card class="ma-4">
      <v-list-item @click="onClickUseLedger">
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
      </v-list-item>
    </v-card>
  </v-card>
  <ledger-dialog
    v-else
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
    };
  },
  methods: {
    onClickUseLedger() {
      this.showLedger = true;
    },
    onCancelLedger() {
      this.showLedger = false;
      this.ledgerMessage = '';
    },
    onConfirmLedger() {
      this.ledgerMessage = this.$t('StepCosmos.message.waitingForCosmosApp');
      this.getCosmosAddressByLedger();
    },
    async getCosmosAddressByLedger() {
      try {
        this.cosmosAddress = await getLedgerCosmosAddress();
        this.ledgerMessage = '';
        this.submitCosmosAddress();
      } catch (err) {
        console.error(err);
        this.ledgerMessage = err;
      }
    },
    async submitCosmosAddress() {
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
