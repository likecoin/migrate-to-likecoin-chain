<template>
  <v-card outlined>
    <v-card-text
      v-for="(text, index) in $t(`Introduction.description.${isLikerId ? 'likerId' : 'manual'}`)"
      :key="index"
    >
      {{ text }}
    </v-card-text>
    <v-row
      class="pb-6"
      justify="center"
    >
      <v-btn
        color="secondary"
        outlined
        rounded
        @click="$emit('confirm')"
      >
        <span class="primary--text">{{ $t('General.confirm') }}</span>
      </v-btn>
    </v-row>
  </v-card>
</template>

<script>
export default {
  props: {
    isLikerId: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
