export const { IS_TESTNET } = process.env;

export const ETHERSCAN_HOST = IS_TESTNET ? 'https://rinkeby.etherscan.io' : 'https://etherscan.io';

export const BIGDIPPER_HOST = IS_TESTNET ? 'http://35.226.174.222' : '';
