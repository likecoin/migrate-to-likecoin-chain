<template>
  <v-card outlined>
    <v-card-subtitle>
      {{ $t('StepValueInput.migarteValue') }}
    </v-card-subtitle>
    <v-card-text class="pb-0">
      <v-text-field
        v-model="value"
        class="text-right display-1"
        :hint="$t('StepValueInput.maxValue', { maxValue: displayMaxValue })"
        size="60"
        :placeholder="displayMaxValue"
        flat
        outlined
        persistent-hint
        reverse
      />
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        :disabled="!isValid || isEditing"
        text
        @click="$emit('confirm', bigValue)"
      >
        Ok
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
const BigNumber = require('bignumber.js');

const ONE_LIKE = new BigNumber(10).pow(18);

export default {
  props: {
    maxValue: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      value: (new BigNumber(this.maxValue)).dividedBy(ONE_LIKE).toFixed(),
      isValid: true,
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
    value(v) {
      try {
        const value = (new BigNumber(v)).multipliedBy(ONE_LIKE);
        if (value.lt(ONE_LIKE)) {
          throw new Error('LOWER_THAN_MIN');
        } else if (value.gt(this.maxValue)) {
          throw new Error('HIGHER_THAN_MAX');
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
};
</script>
