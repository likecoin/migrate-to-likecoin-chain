<template>
  <base-dialog
    :title="$t('MetaMaskDialog.connectMessage')"
    :is-loading="isLoading"
    :is-error="isError"
    @cancel="$emit('cancel')"
  >
    <template #default>
      <slot />
    </template>
  </base-dialog>
</template>

<script>
import BaseDialog from './BaseDialog.vue';

export default {
  name: 'MetamaskDialog',
  components: {
    BaseDialog,
  },
  props: {
    isLoading: {
      type: Boolean,
      default: false,
    },
    isError: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
