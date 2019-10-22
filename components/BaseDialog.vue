<template>
  <v-card
    outlined
    :loading="isLoading && !isError"
  >
    <v-card-title>{{ title }}</v-card-title>
    <v-card-text
      :class="{ 'error--text': isError }"
      v-if="$slots.default"
    >
      <v-icon
        v-if="isError"
        class="mr-1"
        color="error"
      >mdi-alert</v-icon>
      <slot name="default" />
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        text
        @click="$emit('cancel')"
      >
        {{ $t('General.cancel') }}
      </v-btn>
      <slot name="actions-append" />
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  name: 'BaseDialog',
  props: {
    isLoading: {
      type: Boolean,
      default: false,
    },
    isError: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
  },
};
</script>
