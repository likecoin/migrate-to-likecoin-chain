<template>
  <metamask-dialog
    v-if="type==='metamask'"
    :is-loading="isLoading"
    @cancel="onCancel"
  >
    {{ metamaskMessage }}
  </metamask-dialog>
  <ledger-dialog
    v-else-if="type==='ledger'"
    :is-loading="isLoading"
    @confirm="createWeb3Ledger"
    @cancel="onCancel"
  >
    {{ ledgerMessage }}
  </ledger-dialog>
  <v-card
    v-else
    outlined
  >
    <v-card-text>
      {{ $t('StepEthereum.selectWallet') }}
    </v-card-text>
    <v-card class="ma-4 mt-0">
      <v-list-item @click="createWeb3">
        <img
          class="ml-n3 mr-3"
          src="~/assets/images/metamask-fox-wordmark-horizontal.svg"
          width="108px"
        >
        <v-list-item-content>
          <v-list-item-title class="primary--text font-weight-bold">
            {{ $t('General.button.connectMetaMask' ) }}
          </v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-card>
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
</template>
<script>
import * as eth from '../util/eth';
import {
  getLedgerWeb3Engine,
} from '../util/ledger';
import LedgerDialog from './LedgerDialog.vue';
import MetamaskDialog from './MetamaskDialog.vue';

export default {
  components: {
    LedgerDialog,
    MetamaskDialog,
  },
  data() {
    return {
      error: '',
      type: '',
      ledgerMessage: '',
      metamaskMessage: '',
      isLoading: false,
    };
  },
  methods: {
    async createWeb3() {
      try {
        this.type = 'metamask';
        this.isLoading = true;
        this.metamaskMessage = this.$t('StepEthereum.message.waitingForMetamask');
        let web3;
        if (window.ethereum) {
          await window.ethereum.enable();
          web3 = eth.initWindowWeb3(window.ethereum);
        } if (window.web3) {
          web3 = eth.initWindowWeb3(window.web3.currentProvider);
        }
        if (!web3) throw new Error(this.$t('StepEthereum.message.noWeb3'));
        await eth.checkNetwork();
        this.metamaskMessage = '';
        const ethAddress = await eth.getFromAddr();
        const ethBalance = await eth.getLikeCoinBalance(ethAddress);
        const isLedger = false;
        this.isLoading = false;
        this.metamaskMessage = '';
        this.$emit('confirm', {
          ethAddress,
          ethBalance,
          web3,
          isLedger,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        this.metamaskMessage = err;
      }
    },
    async createWeb3Ledger() {
      try {
        this.ledgerMessage = this.$t('StepEthereum.message.waitingForEthApp');
        const web3 = eth.initWindowWeb3(await getLedgerWeb3Engine());
        const ethAddress = await eth.getFromAddr();
        const ethBalance = await eth.getLikeCoinBalance(ethAddress);
        const isLedger = true;
        this.ledgerMessage = '';
        this.$emit('confirm', {
          ethAddress,
          ethBalance,
          web3,
          isLedger,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        this.ledgerMessage = err;
      }
    },
    onClickUseLedger() {
      this.type = 'ledger';
    },
    onCancel() {
      this.type = '';
    },
  },
};
</script>
