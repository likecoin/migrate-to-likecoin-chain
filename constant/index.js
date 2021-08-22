import { IS_TESTNET } from '../common/constant';

export const ETHERSCAN_HOST = IS_TESTNET ? 'https://rinkeby.etherscan.io' : 'https://etherscan.io';

export const BIGDIPPER_HOST = IS_TESTNET ? 'https://taipei.likecoin.bigdipper.live' : 'https://likecoin.bigdipper.live';

export const LIKECOIN_API_HOST = IS_TESTNET ? 'https://api.taipei.like.co' : 'https://api.like.co';

export const CHAIN_ID = IS_TESTNET ? 'iscn-dev-chain-2' : 'likecoin-chain-sheungwan'; // TODO: change to mainnet ID

export * from '../common/constant';
