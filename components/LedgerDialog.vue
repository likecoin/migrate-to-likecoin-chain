<template>
  <base-dialog
    :title="`${$t('LedgerDialog.connectMessage')} ${ledgerAppName}`"
    :is-loading="isLoading"
    :is-error="isError"
    @cancel="$emit('cancel')"
  >
    <template #default>
      <slot />
      <v-checkbox
        v-model="isLive"
        label="Ledger Live"
      ></v-checkbox>
      <div v-if="isFetchingAddresses">{{ $t('LedgerDialog.fetchingAddressList') }}</div>
      <v-select
        v-else
        v-model="wallet"
        :items="walletList"
        :placeholder="$t('LedgerDialog.connectAndRefresh')"
        label="Address"
        prepend-icon="mdi-refresh"
        @click:prepend="onRefreshWalletList"
      ></v-select>
      <v-row v-if="wallet">LIKE: {{ likeAmount }}</v-row>
    </template>
    <template #actions-append>
      <v-btn
        v-if="waitForConfirm"
        color="primary"
        text
        @click="onConfirm"
      >
        {{ $t('General.confirm') }}
      </v-btn>
    </template>
  </base-dialog>
</template>

<script>
import BaseDialog from './BaseDialog.vue';
import {
  initWindowWeb3,
  getAddrList,
  getLikeCoinBalance,
} from '../util/eth';
import { getLedgerWeb3Engine } from '../util/ledger';

const BigNumber = require('bignumber.js');

const ONE_LIKE = new BigNumber(10).pow(18);

export default {
  name: 'LedgerDialog',
  components: {
    BaseDialog,
  },
  props: {
    type: {
      type: String,
      default: 'eth',
    },
    waitForConfirm: {
      type: Boolean,
      default: true,
    },
    isLoading: {
      type: Boolean,
      default: false,
    },
    isError: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      walletList: [],
      isLive: false,
      isFetchingAddresses: false,
      wallet: '',
      likeAmount: 0,
      offset: 0,
    };
  },
  computed: {
    ledgerAppName() {
      if (this.type === 'cosmos') return this.$t('LedgerDialog.cosmosApp');
      if (this.type === 'eth') return this.$t('LedgerDialog.ethApp');
      return '';
    },
  },
  mounted() {
    this.onRefreshWalletList();
  },
  methods: {
    async onRefreshWalletList() {
      try {
        this.isFetchingAddresses = true;
        const provider = getLedgerWeb3Engine({ isLegacy: !this.isLive, offset: this.offset });
        initWindowWeb3(provider);
        this.walletList = await getAddrList();
        if (this.walletList.length) [this.wallet] = this.walletList;
        this.isFetchingAddresses = false;
      } catch (err) {
        console.log(err);
        this.isFetchingAddresses = false;
        // no op
      }
    },
    async onUpdateWallet() {
      this.offset = this.wallet ? this.walletList.indexOf(this.wallet) : 0;
      this.likeAmount = (new BigNumber(await getLikeCoinBalance(this.wallet)))
        .dividedBy(ONE_LIKE)
        .toFixed();
    },
    onConfirm() {
      this.$emit('confirm', { isLegacy: !this.isLive, offset: this.offset });
    },
  },
  watch: {
    isLive() {
      this.onRefreshWalletList();
    },
    wallet() {
      this.onUpdateWallet();
    },
  },
};
</script>
