<template>
  <div v-if="!showLedger">
    <form @submit.prevent="submitCosmosAddress">
      <span v-if="error">{{ error }}</span>
      <div>
        Cosmos address:
        <input v-model="cosmosAddress" size="60">
      </div>
      <button type="submit">
        Continue
      </button>
    </form>
    <button
      @click="onClickUseLedger"
    >
      Get Ledger Cosmos Address
    </button>
  </div>
  <div v-else>
    <ledger-dialog
      @cancel="onCancelLedger"
      @confirm="onConfirmLedger"
    >
      {{ ledgerMessage }}
    </ledger-dialog>
  </div>
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
      this.ledgerMessage = 'waiting for Cosmos ledger App...';
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
        this.error = 'INVALID_COSMOS_ADDRESS';
      } else {
        this.$emit('confirm', this.cosmosAddress);
      }
    },
  },
};
</script>
