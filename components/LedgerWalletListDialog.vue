<template>
  <base-dialog
    :title="$t('LedgerWalletListDialog.title.eth')"
  >
    <template #default>
      <slot />
      <div class="mr-4 text-right">
        <div>{{ $t('LedgerWalletListDialog.findAddress') }}</div>
        <div>
          {{ $t('LedgerWalletListDialog.try') }}
          <a href="#" @click.prevent="isLive = !isLive">
            Ledger {{ isLive ? 'Legacy' : 'Live' }}
          </a>
        </div>
      </div>
      <div
        v-if="errorMessage"
        class="error--text"
      >
        {{ errorMessage }}
      </div>
      <v-icon
        v-if="isFetchingAddresses"
        class="my-4"
        large
      >
        mdi-dots-horizontal
      </v-icon>
      <v-radio-group
        v-else
        v-model="walletIndex"
      >
        <v-radio
          v-for="(w, index) in radioList"
          :key="w.address"
          class="justify-space-between"
          :value="index"
        >
          <template v-slot:label>
            <v-card
              :flat="true"
              :outlined="true"
              :width="320"
              :class="[{
                'grey lighten-4': index === walletIndex,
              }]"
            >
              <v-card-text class="pa-1 text-right">
                <div class="caption text-truncate">
                  {{ w.address }}
                </div>
                <div class="subtitle-2">
                  {{ getLikeCoinDisplayAmount(w.amount) }} LIKE
                </div>
              </v-card-text>
            </v-card>
          </template>
        </v-radio>
      </v-radio-group>
    </template>
    <template #actions-append>
      <v-btn
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
  name: 'LedgerWalletListDialog',
  components: {
    BaseDialog,
  },
  props: {
    type: {
      type: String,
      default: 'eth',
    },
    web3: {
      type: Object,
      default: () => null,
    },
    wallet: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      walletList: [],
      radioList: [],
      isLive: false,
      isFetchingAddresses: false,
      walletIndex: 0,
      errorMessage: '',
      currentWeb3: this.web3,
    };
  },
  computed: {
    currentWallet() {
      return this.walletList[this.walletIndex];
    },
    currentAmount() {
      if (this.radioList.length) {
        return this.radioList[this.walletIndex].amount.toFixed();
      }
      return '0';
    },
  },
  watch: {
    isLive() {
      const provider = getLedgerWeb3Engine({ isLegacy: !this.isLive });
      this.currentWeb3 = initWindowWeb3(provider);
      this.onRefreshWalletList();
    },
  },
  mounted() {
    this.errorMessage = '';
    this.onRefreshWalletList();
  },
  methods: {
    getLikeCoinDisplayAmount(amount) {
      return amount.dividedBy(ONE_LIKE).toFixed();
    },
    async onRefreshWalletList() {
      try {
        this.isFetchingAddresses = true;
        const walletList = await getAddrList();
        this.walletList = walletList;
        this.radioList = walletList.map((address) => ({ address }));
        if (this.wallet && walletList.length) {
          this.walletIndex = walletList.indexOf(this.wallet);
        }
        if (this.walletIndex < 0) {
          this.walletIndex = 0;
        }
        this.radioList = await Promise.all(walletList.map(
          async (address) => ({
            address,
            amount: new BigNumber(await getLikeCoinBalance(address)),
          }),
        ));
        this.isFetchingAddresses = false;
      } catch (err) {
        console.log(err);
        this.errorMessage = err;
        this.isFetchingAddresses = false;
      }
    },
    onConfirm() {
      this.$emit('confirm', {
        ethAddress: this.currentWallet,
        ethBalance: this.currentAmount,
        web3: this.currentWeb3,
      });
    },
    onCancel() {
      this.$emit('cancel');
    },
  },
};
</script>
