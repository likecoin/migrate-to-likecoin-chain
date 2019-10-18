<template>
  <div>
    <div>{{ $t('LedgerDialog.connectMessage') }} {{ ledgerAppName }}</div>
    <slot />
    <button
      @click="$emit('cancel')"
    >
      {{ $t('General.cancel') }}
    </button>
    <button
      v-if="waitForConfirm"
      @click="$emit('confirm')"
    >
      {{ $t('General.confirm') }}
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
      if (this.type === 'cosmos') return this.$t('cosmosApp');
      if (this.type === 'eth') return this.$t('ethApp');
      return '';
    },
  },
};
</script>
