<template>
  <div>
    <div>Please connect to MetaMask desu</div>
    <slot></slot>
    <button
      @click="$emit('cancel')"
    >
      Cancel
    </button>
  </div>
</template>
