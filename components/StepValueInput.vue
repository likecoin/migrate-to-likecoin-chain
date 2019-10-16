<template>
  <div>
    <div>
      Migrate value:
      <input
        v-model="value"
        type="number"
        size="60"
        :disabled="!isEditing"
      >
      <button @click="!isEditing">
        {{ isEditing ? 'confirm' : 'edit' }}
      </button>
      Max value {{ maxValue }}
    </div>
    <button
      :disabbed="isEditing"
      @click="$emit('confirm', value)"
    >
      Ok
    </button>
  </div>
</template>
<script>
export default {
  props: {
    maxValue: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      value: this.maxValue,
      isEditing: true,
    };
  },
};
</script>
