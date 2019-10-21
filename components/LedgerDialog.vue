<template>
  <v-card
    outlined
    :loading="isLoading"
  >
    <v-card-title>
      {{ $t('LedgerDialog.connectMessage') }} {{ ledgerAppName }}
    </v-card-title>
    <v-card-text v-if="$slots.default">
      <slot />
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        text
        @click="$emit('cancel')"
      >
        {{ $t('General.cancel') }}
      </v-btn>
      <v-btn
        v-if="waitForConfirm"
        color="primary"
        text
        @click="$emit('confirm')"
      >
        {{ $t('General.confirm') }}
      </v-btn>
    </v-card-actions>
  </v-card>
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
    isLoading: {
      type: Boolean,
      default: false,
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
