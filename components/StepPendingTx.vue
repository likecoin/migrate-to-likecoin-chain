<template>
  <v-card
    class="px-4 py-8"
    outlined
  >
    <div
      v-if="error"
      class="text-center"
    >
      <div class="error--text display-1">
        {{ $t('StepPendingTx.error') }}
      </div>
      <v-icon
        class="my-4"
        color="error"
        large
      >
        mdi-alert
      </v-icon>
      <div class="body-2 error--text text--darken-4">
        {{ error }}
      </div>
    </div>
    <div
      v-else-if="isDone"
      class="text-center"
    >
      <div class="primary--text display-1">
        {{ $t('StepPendingTx.done') }}
      </div>
      <v-icon
        class="my-4"
        color="primary"
        large
      >
        mdi-check
      </v-icon>
      <div class="body-2">
        <i18n path="StepPendingTx.doneDescription" tag="div">
          <a :href="cosmosTxLink" target="_blank">likecoin.bigdipper.live</a>
        </i18n>
      </div>
    </div>
    <div
      v-else-if="processingCosmosTxHash"
      class="text-center"
    >
      <div class="headline blue--text">
        {{ $t('StepPendingTx.waitingForCosmosTx') }}
      </div>
      <v-icon
        class="my-4"
        large
      >
        mdi-dots-horizontal
      </v-icon>
      <div class="caption">
        {{ processingCosmosTxHash }}
      </div>
      <a
        class="body-2"
        :href="cosmosTxLink"
        target="_blank"
      >{{ $t('StepPendingTx.viewOnBigdipper') }}</a>
    </div>
    <div
      v-else-if="state === 'confirm'"
      class="text-center"
    >
      <div class="headline blue--text">
        {{ $t('StepPendingTx.waitingForMoreBlockConfirm') }}
      </div>
      <v-icon
        class="my-4"
        large
      >
        mdi-dots-horizontal
      </v-icon>
      <div class="caption">
        {{ processingEthTxHash }}
      </div>
      <a
        class="body-2"
        :href="ethTxLink"
        target="_blank"
      >{{ $t('StepPendingTx.viewOnEtherscan') }}</a>
    </div>
    <div
      v-else-if="state === 'pending'"
      class="text-center"
    >
      <div class="headline blue--text">
        {{ $t('StepPendingTx.waitingForSystemConfirm') }}
      </div>
      <v-icon
        class="my-4"
        large
      >
        mdi-dots-horizontal
      </v-icon>
      <div class="caption">
        {{ processingEthTxHash }}
      </div>
      <a
        class="body-2"
        :href="ethTxLink"
        target="_blank"
      >{{ $t('StepPendingTx.viewOnEtherscan') }}</a>
    </div>
    <div
      v-else
      class="text-center"
    >
      <div class="headline blue--text">
        {{ $t('StepPendingTx.waitingForEthTx') }}
      </div>
      <v-icon
        class="my-4"
        large
      >
        mdi-dots-horizontal
      </v-icon>
      <div class="caption">
        {{ processingEthTxHash }}
      </div>
      <a
        class="body-2"
        :href="ethTxLink"
        target="_blank"
      >{{ $t('StepPendingTx.viewOnEtherscan') }}</a>
    </div>

    <signing-form
      class="mx-auto mt-8"
      :liker-id="likerId"
      :eth-address="ethAddress"
      :cosmos-address="cosmosAddress"
      :value="displayValue"
      :is-loading="(processingCosmosTxHash || processingEthTxHash) && !isDone"
      :outlined="false"
      elevation="1"
    />
    <v-card-actions
      v-if="error"
      class="pt-6 pb-0"
    >
      <v-spacer />
      <v-btn
        color="secondary"
        outlined
        rounded
        @click="$emit('reset')"
      >
        <span class="primary--text px-2">{{ $t("General.retry") }}</span>
      </v-btn>
      <v-spacer />
    </v-card-actions>
    <v-card-actions
      v-else-if="isDone && likerId"
      class="pt-6 pb-0"
    >
      <v-spacer />
      <v-btn
        color="secondary"
        outlined
        rounded
        :href="likeCoLink"
      >
        <span class="primary--text px-2">{{ $t("StepPendingTx.backToLikeCo") }}</span>
      </v-btn>
      <v-spacer />
    </v-card-actions>
  </v-card>
</template>

<script>
import * as eth from '../util/eth';
import * as cosmos from '../util/cosmos';
import {
  ETHERSCAN_HOST,
  BIGDIPPER_HOST,
  LIKECO_HOST,
} from '../constant';
import {
  apiGetPendingCosmosMigration,
} from '../util/api';
import { timeout } from '../common/util/misc';

import SigningForm from './SigningForm.vue';

const BigNumber = require('bignumber.js');

const ONE_LIKE = new BigNumber(10).pow(18);
const ONE_COSMOS_LIKE = new BigNumber(10).pow(9);

export default {
  components: {
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
    processingEthTxHash: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      state: '',
      isDone: false,
      error: '',
      resultValue: 0,
      processingCosmosTxHash: '',
    };
  },
  computed: {
    ethTxLink() {
      return `${ETHERSCAN_HOST}/tx/${this.processingEthTxHash}`;
    },
    cosmosTxLink() {
      return `${BIGDIPPER_HOST}/transactions/${this.processingCosmosTxHash}`;
    },
    likeCoLink() {
      return `${LIKECO_HOST}/in`;
    },
    displayValue() {
      if (this.resultValue) {
        return (new BigNumber(this.resultValue)).dividedBy(ONE_COSMOS_LIKE).toFixed();
      }
      return (new BigNumber(this.value)).dividedBy(ONE_LIKE).toFixed();
    },
  },
  mounted() {
    this.waitForEth();
  },
  methods: {
    async waitForEth() {
      this.state = 'eth';
      try {
        await eth.waitForTxToBeMined(this.processingEthTxHash);
        this.state = 'confirm';
        await eth.waitForTxToBeMined(this.processingEthTxHash, { waitforConfirm: true });
        this.waitForConfirm();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        this.error = err;
      }
    },
    async waitForConfirm() {
      this.state = 'pending';
      try {
        while (!this.processingCosmosTxHash) {
          /* eslint-disable no-await-in-loop */
          await timeout(10000);
          await this.updateCosmosProcessingTx();
          /* eslint-enable no-await-in-loop */
        }
        this.waitForCosmos();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        this.error = err;
      }
    },
    async updateCosmosProcessingTx() {
      const { data } = await apiGetPendingCosmosMigration(
        this.cosmosAddress,
        this.processingEthTxHash,
      );
      if (data && data.list && data.list.length) {
        const [targetTx] = data.list;
        this.processingCosmosTxHash = targetTx.txHash;
      }
    },
    async waitForCosmos() {
      this.state = 'cosmos';
      try {
        const msg = await cosmos.waitForTxToBeMined(this.processingCosmosTxHash);
        this.resultValue = msg.amount[0].amount; // TODO: parse amount
        this.isDone = true;
        this.$emit('done');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        this.error = err;
      }
    },
  },
};
</script>
