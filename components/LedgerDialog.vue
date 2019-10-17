<template>
  <div>
    <div>Please connect Ledger desu {{ ledgerAppName }}</div>
    <slot />
    <button
      @click="$emit('cancel')"
    >
      Cancel
    </button>
    <button
      v-if="waitForConfirm"
      @click="$emit('confirm')"
    >
      Ok
    </button>
  </div>
</template>
<script>
export default {
  props: {
    type: {
      type: String,
      default: 'eth',
    },
    waitForConfirm: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    ledgerAppName() {
      if (this.type === 'cosmos') return 'cosmosApp';
      if (this.type === 'eth') return 'EthApp';
      return '';
    },
  },
};
</script>
