<template>
  <div>
    <div>{{ $t('MetaMaskDialog.connectMessage') }}</div>
    <slot />
    <button
      @click="$emit('cancel')"
    >
      {{ $t('General.cancel') }}
    </button>
  </div>
</template>
