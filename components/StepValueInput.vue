<template>
  <ledger-wallet-list-dialog
    v-if="isChangingWallet"
    type="eth"
    :web3="web3"
    :wallet="wallet"
    @cancel="onCancelEditWallet"
    @confirm="onConfirmEditWallet"
  />
  <v-card v-else outlined>
    <v-card-title>
      {{ $t('StepValueInput.yourWallet') }}
    </v-card-title>
    <v-card-text class="pb-0">
      <div>{{ wallet }}</div>
      <div>{{ displayMaxValue }} LIKE</div>
      <a v-if="isLedger" href="#" @click.prevent="onEditWallet">
        {{ $t('StepValueInput.editWallet') }}
      </a>
    </v-card-text>
    <v-card-subtitle>
      {{ $t('StepValueInput.migarteValue') }}
    </v-card-subtitle>
    <v-card-text class="pb-0">
      <v-text-field
        v-model="value"
        class="text-center display-1"
        :hint="$t('StepValueInput.hint')"
        size="60"
        :placeholder="displayMaxValue"
        flat
        outlined
        persistent-hint
        reverse
      >
        <template #append>
          <div class="caption mt-1">
            LIKE
          </div>
        </template>
      </v-text-field>
    </v-card-text>
    <v-card-actions class="pb-4">
      <v-spacer />
      <v-btn
        color="secondary"
        :disabled="!isValid"
        outlined
        rounded
        @click="$emit('confirm', bigValue)"
      >
        <span
          :class="{ 'primary--text': isValid, 'px-2': true }"
        >{{ $t('General.confirm') }}</span>
      </v-btn>
      <v-spacer />
    </v-card-actions>
  </v-card>
</template>
<script>
import { ETH_MIN_LIKECOIN_AMOUNT } from '../constant';
import LedgerWalletListDialog from './LedgerWalletListDialog.vue';

const BigNumber = require('bignumber.js');

const ONE_LIKE = new BigNumber(10).pow(18);

export default {
  components: {
    LedgerWalletListDialog,
  },
  props: {
    maxValue: {
      type: String,
      required: true,
    },
    isLedger: {
      type: Boolean,
      default: false,
    },
    web3: {
      type: Object,
      default: () => null,
    },
    wallet: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      value: (new BigNumber(this.maxValue)).dividedBy(ONE_LIKE).toFixed(),
      isValid: true,
      isChangingWallet: false,
    };
  },
  computed: {
    bigValue() {
      return new BigNumber(this.value).multipliedBy(ONE_LIKE).toFixed();
    },
    displayMaxValue() {
      return (new BigNumber(this.maxValue)).dividedBy(ONE_LIKE).toFixed();
    },
  },
  watch: {
    maxValue(max) {
      this.value = (new BigNumber(max)).dividedBy(ONE_LIKE).toFixed();
    },
    value(v) {
      try {
        const value = (new BigNumber(v)).multipliedBy(ONE_LIKE);
        if (value.lt(ETH_MIN_LIKECOIN_AMOUNT)) {
          throw new Error('LOWER_THAN_MIN');
        } else if (value.gt(this.maxValue)) {
          throw new Error('HIGHER_THAN_MAX');
        } else if (value.isNaN()) {
          throw new Error('INVALID');
        }
        this.isValid = true;
        this.value = value
          .dividedBy(1e9)
          .integerValue(BigNumber.ROUND_DOWN)
          .dividedBy(1e9)
          .toFixed();
      } catch (err) {
        this.isValid = false;
      }
    },
  },
  methods: {
    onEditWallet() {
      this.isChangingWallet = true;
    },
    onConfirmEditWallet(payload) {
      this.isChangingWallet = false;
      const {
        ethAddress,
        ethBalance,
        web3,
      } = payload;
      this.$emit('change-eth-wallet', {
        ethAddress,
        ethBalance,
        web3,
        isLedger: this.isLedger,
      });
    },
    onCancelEditWallet() {
      this.isChangingWallet = false;
    },
  },
};
</script>
