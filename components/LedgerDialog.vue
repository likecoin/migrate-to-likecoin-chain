<template>
  <base-dialog
    :title="`${$t('LedgerDialog.connectMessage')} ${ledgerAppName}`"
    :is-loading="isLoading"
    :is-error="isError"
    @cancel="$emit('cancel')"
  >
    <template #default>
      <slot />
    </template>
    <template #actions-append>
      <v-btn
        v-if="waitForConfirm"
        color="primary"
        text
        @click="$emit('confirm')"
      >
        {{ $t('General.confirm') }}
      </v-btn>
    </template>
  </base-dialog>
</template>

<script>
import BaseDialog from './BaseDialog.vue';

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
  computed: {
    ledgerAppName() {
      if (this.type === 'cosmos') return this.$t('LedgerDialog.cosmosApp');
      if (this.type === 'eth') return this.$t('LedgerDialog.ethApp');
      return '';
    },
  },
};
</script>
