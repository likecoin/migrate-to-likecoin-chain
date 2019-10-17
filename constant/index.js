import { IS_TESTNET } from '../common/constant';

export const ETHERSCAN_HOST = IS_TESTNET ? 'https://rinkeby.etherscan.io' : 'https://etherscan.io';

export const BIGDIPPER_HOST = IS_TESTNET ? 'https://taipei.likecoin.bigdipper.live' : 'https://taipei.likecoin.bigdipper.live';

export * from '../common/constant';
