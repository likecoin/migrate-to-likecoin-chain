import { IS_TESTNET } from '../common/constant';

export const ETHERSCAN_HOST = IS_TESTNET ? 'https://rinkeby.etherscan.io' : 'https://etherscan.io';

export const BIGDIPPER_HOST = IS_TESTNET ? 'https://taipei.likecoin.bigdipper.live' : 'https://likecoin.bigdipper.live';

export const LIKECOIN_API_HOST = IS_TESTNET ? 'https://api.taipei.like.co' : 'https://api.like.co';

export * from '../common/constant';
