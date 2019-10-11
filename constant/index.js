import { IS_TESTNET } from '../common/constant';

export const ETHERSCAN_HOST = IS_TESTNET ? 'https://rinkeby.etherscan.io' : 'https://etherscan.io';

export const BIGDIPPER_HOST = IS_TESTNET ? 'http://35.226.174.222' : '';

export * from '../common/constant';
