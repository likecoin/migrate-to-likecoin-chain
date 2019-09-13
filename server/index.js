import { Nuxt, Builder } from 'nuxt'
import express from 'express'
import proxy from 'express-http-proxy'
import consola from 'consola'
import bodyParser from 'body-parser'
import { COSMOS_ENDPOINT } from '../config'

// Import and Set Nuxt.js options
import * as config from '../nuxt.config.js'

import { migrateHandler } from './migrate'

config.dev = process.env.NODE_ENV !== 'production'

const app = express()
app.use('/api', proxy(COSMOS_ENDPOINT))

async function start () {
  // Init Nuxt.js
  const nuxt = new Nuxt(config)

  const { host, port } = nuxt.options.server

  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  } else {
    await nuxt.ready()
  }

  app.use(bodyParser.json())

  app.post('/migrate', migrateHandler)

  // Give nuxt middleware to express
  app.use(nuxt.render)

  // Listen the server
  app.listen(port, host)
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })
}
start()
