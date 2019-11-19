<template>
  <v-card outlined>
    <v-card-text>
      {{ $t(`Introduction.${isLikerId ? 'likerId' : 'manual'}.description0`) }}
    </v-card-text>
    <v-card-text>
      {{ $t(`Introduction.${isLikerId ? 'likerId' : 'manual'}.description1`) }}
    </v-card-text>
    <v-card-text>
      {{ $t(`Introduction.${isLikerId ? 'likerId' : 'manual'}.description2`) }}
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
