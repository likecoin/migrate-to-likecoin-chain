const path = require('path');

const {
  IS_TESTNET,
  CI,
} = process.env;

module.exports = {
  mode: 'spa',
  env: {
    IS_TESTNET,
    CI,
  },
  /*
  ** Headers of the page
  */
  head: {
    title: 'Migrate to LikeCoin Chain',
    description: 'ERC20 LIKE to LikeCoin chain Migration',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: process.env.npm_package_description || '' },
      { hid: 'og_title', property: 'og:title', content: 'Migrate to LikeCoin Chain' },
      { hid: 'og_description', property: 'og:description', content: 'ERC20 LIKE to LikeCoin chain Migration' },
      { hid: 'og_image', property: 'og:image', content: 'https://like.co/images/og/default.png' },
      { hid: 'og_image_alt', property: 'og:image:alt', content: 'LikeCoin' },
      { hid: 'og_image_width', property: 'og:image:width', content: '1200' },
      { hid: 'og_image_height', property: 'og:image:height', content: '630' },
      { hid: 'theme-color', name: 'theme-color', content: '#D2F0F0' },
    ],
    link: [
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'preload', href: '/vendor/fb/pixel.js', as: 'script' },
    ],
  },
  /*
  ** Customize the progress-bar color
  */
  loading: { color: '#50e3c2' },
  /*
  ** Global CSS
  */
  css: [
    { src: '@likecoin/ui-vue/dist/ui-vue.css', lang: 'css' },
  ],
  /*
  ** Plugins to load before mounting the App
  */
  plugins: [
    { src: '~/plugins/likecoin-ui-vue' },
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
    ['@nuxtjs/google-tag-manager', {
      id: process.env.GTM_ID || 'GTM-XXXXXXX',
      pageTracking: true,
      respectDoNotTrack: true,
    }],
    '@nuxtjs/sentry',
  ],
  /*
  ** Axios module configuration
  ** See https://axios.nuxtjs.org/options
  */
  axios: {
  },
  sentry: {
    clientIntegrations: {
      /* default integrations will still be added due to deep-merge */
      ReportingObserver: false, // reporting is very noisy on CSP violation.
    },
    config: {
      release: process.env.RELEASE,
      include: ['.nuxt/dist'],
      ignore: ['node_modules'],
      configFile: '.sentryclirc',
    },
  },
  /*
  ** Build configuration
  */
  build: {
    extractCSS: true,
    babel: {
      presets: ({ isServer }) => [
        [
          '@nuxt/babel-preset-app',
          {
            targets: isServer
              ? { node: '10' }
              : 'ie 11, > 0.5%, Firefox ESR',
          },
        ],
      ],
    },
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
