<template>
  <v-card
    :loading="isLoading"
    max-width="392px"
    outlined
    v-bind="$attrs"
  >
    <slot name="form-prepend" />
    <v-list disabled>
      <v-list-item-group>
        <template v-if="likerId">
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title v-text="$t('Common.likerId')" />
              <v-list-item-subtitle v-text="likerId" />
            </v-list-item-content>
          </v-list-item>
        </template>
        <template v-else>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title v-text="$t('Common.ethFrom')" />
              <v-list-item-subtitle v-text="ethAddress" />
            </v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-content>
              <v-list-item-title v-text="$t('Common.cosmosTo')" />
              <v-list-item-subtitle v-text="cosmosAddress" />
            </v-list-item-content>
          </v-list-item>
        </template>
        <v-list-item>
          <v-list-item-content>
            <v-list-item-title v-text="$t('Common.value')" />
            <v-list-item-subtitle v-text="`${value} LIKE`" />
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>
    <slot name="form-append" />
  </v-card>
</template>

<script>
export default {
  name: 'SigningForm',
  props: {
    isLoading: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    ethAddress: {
      type: String,
      default: '',
    },
    cosmosAddress: {
      type: String,
      default: '',
    },
    value: {
      type: String,
      default: '',
    },
    likerId: {
      type: String,
      default: '',
    },
  },
};
</script>
