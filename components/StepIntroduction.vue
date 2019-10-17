<template>
  <div>
    {{ $t('Introduction.description') }}
    <button
      @click="$emit('confirm')"
    >
      {{ $t('General.confirm') }}
    </button>
  </div>
</template>
