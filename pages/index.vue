<template>
  <div id="app">
    <div>
      Ethereum address: {{ ethAddr }}
    </div>
    <div>
      Ethereum balance: {{ ethBalance }}
    </div>
    <div>
      Cosmos address: <input v-model="cosmosAddr" size="60">
    </div>
    <div>
      Cosmos balance: {{ cosmosBalance }}
    </div>
    <div>
      Amount: <input v-model="valueToSend" size="30">
      <button @click="send">
        Sign and send to cosmos
      </button>
    </div>
  </div>
</template>

<script>
import Web3 from 'web3'
import axios from 'axios'
import * as eth from '../lib/eth'
import * as cosmos from '../lib/cosmos'
import { sleep } from '../lib/utils'
import * as config from '../config'

async function createWeb3 () {
  // TODO: check network
  if (window.ethereum) {
    await window.ethereum.enable()
    return new Web3(window.ethereum)
  } else if (window.web3) {
    return new Web3(window.web3.currentProvider)
  } else {
    throw new Error('Cannot detect web3 from browser')
  }
}

export default {
  data: () => ({
    ethAddr: null,
    ethBalance: '0',
    cosmosAddr: '',
    cosmosBalance: '0nanolike',
    valueToSend: '0'
  }),
  async mounted () {
    const web3 = await createWeb3()
    eth.initWeb3(web3)
    cosmos.init('/api')
    this.poll()
  },
  methods: {
    async getEthBalance () {
      this.ethBalance = await eth.getLikeCoinBalance(this.ethAddr)
    },
    async getCosmosBalance () {
      let amount = 0
      try {
        if (this.cosmosAddr) {
          const accountInfo = await cosmos.getAccountInfo(this.cosmosAddr)
          if (accountInfo.coins) {
            const coin = accountInfo.coins.filter(coin => coin.denom === config.COSMOS_DENOM)[0]
            if (coin) {
              ({ amount } = coin)
            }
          }
        }
      } finally {
        this.cosmosBalance = new cosmos.Coin(amount, config.COSMOS_DENOM).toString()
      }
    },
    async poll () {
      while (true) {
        try {
          this.ethAddr = await eth.getFromAddr()
          console.log(this.ethAddr)
          await Promise.all([this.getEthBalance(), this.getCosmosBalance()])
        } finally {
          await sleep(10000)
        }
      }
    },
    async send () {
      const migrationData = await eth.signMigration(this.ethAddr, this.valueToSend)
      migrationData.cosmosAddress = this.cosmosAddr
      console.log(migrationData)
      await axios.post('/migrate', migrationData)
    }
  }
}
</script>
