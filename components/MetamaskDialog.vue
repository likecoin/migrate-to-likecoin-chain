<template>
  <v-card
    outlined
    :loading="isLoading"
  >
    <v-card-title>{{ $t('MetaMaskDialog.connectMessage') }}</v-card-title>
    <v-card-text v-if="$slots.default">
      <slot />
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        text
        @click="$emit('cancel')"
      >{{ $t('General.cancel') }}</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'metamask-dialog',
  props: {
    isLoading: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
