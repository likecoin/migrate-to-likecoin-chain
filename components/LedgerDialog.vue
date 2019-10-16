<template>
  <div>
    <div>Please connect Ledger desu {{ ledgerAppName }}</div>
    <slot></slot>
    <button
      @click="$emit('cancel')"
    >
      Cancel
    </button>
    <button
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
