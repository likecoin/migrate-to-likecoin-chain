const path = require('path');

module.exports = {
  mode: 'spa',
  env: {
    IS_TESTNET: process.env.IS_TESTNET,
    CI: process.env.CI,
  },
  /*
  ** Headers of the page
  */
  head: {
    title: process.env.npm_package_name || '',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: process.env.npm_package_description || '' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ],
  },
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#fff' },
  /*
  ** Global CSS
  */
  css: [
  ],
  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
    { src: '~/plugins/vue-i18n' },
  ],
  /*
  ** Nuxt.js dev-modules
  */
  buildModules: [
    // Doc: https://github.com/nuxt-community/eslint-module
    '@nuxtjs/eslint-module',
    // Doc: https://github.com/nuxt-community/vuetify-module
    '@nuxtjs/vuetify',
  ],
  /*
  ** Nuxt.js modules
  */
  modules: [
    // Doc: https://axios.nuxtjs.org/usage
    '@nuxtjs/axios',
  ],
  /*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
  axios: {
  },
  /*
  ** Build configuration
  */
  build: {
    /*
    ** You can extend webpack config here
    */
    extend(config, { isClient }) {
      /* eslint-disable no-param-reassign */
      // https://github.com/ethereum/web3.js/issues/1178
      if (process.env.NODE_ENV === 'production') {
        config.resolve.alias['bn.js'] = path.join(__dirname, './node_modules/bn.js');
      }

      if (isClient) {
        if (process.env.NODE_ENV === 'production') {
          config.devtool = 'source-map';
        }
        /*
        ** Run ESLINT on save
        */
        config.module.rules.push({
          enforce: 'pre',
          test: /\.(js|vue)$/,
          loader: 'eslint-loader',
          exclude: /(node_modules)/,
        });
      }
      /* eslint-enable no-param-reassign */
    },
  },
  vuetify: {
    theme: {
      themes: {
        light: {
          primary: '#28646E',
          secondary: '#50E3C2',
        },
      },
    },
  },
};
