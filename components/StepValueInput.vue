<template>
  <div>
    <div>
      Migrate value:
      <input
        v-model="value"
        size="60"
        :disabled="!isEditing"
      >
      <button @click="() => isEditing = !isEditing">
        {{ isEditing ? 'confirm' : 'edit' }}
      </button>
      Max value {{ displayMaxValue }}
    </div>
    <button
      :disabled="!isValid || isEditing"
      @click="$emit('confirm', bigValue)"
    >
      Ok
    </button>
  </div>
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
      isEditing: false,
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
