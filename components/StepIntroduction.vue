<template>
  <v-card outlined>
    <v-card-text>
      {{ $t('Introduction.description') }}
    </v-card-text>
    <v-row
      class="pb-6"
      justify="center"
    >
      <v-btn
        color="primary"
        @click="$emit('confirm')"
      >{{ $t('General.confirm') }}</v-btn>
    </v-row>
  </v-card>
</template>
