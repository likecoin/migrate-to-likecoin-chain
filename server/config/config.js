export const FIRESTORE_TX_ROOT = '';
export const FIRESTORE_CONFIG_ROOT = '';
import * as config from '../../config/config';

export const ETH_ENDPOINT = 'https://mainnet.infura.io/v3/PROJECT_ID';
export const ETH_CONFIRMATION_NEEDED = 12;
export const ETH_CONTRACT_ADDRESS = '0x1111111111111111111111111111111111111111';
export const {
  ETH_LOCK_ADDRESS,
  ETH_MIN_LIKECOIN_AMOUNT,
  ETH_CONFIRMATION_NEEDED,
} = config;

// the address which locks the ERC-20 LikeCoin
export const ETH_LOCK_ADDRESS = '0xc111111111111111111111111111111111111111';

// minimum amount of ERC-20 LikeCoin to migrate in wei
export const ETH_MIN_LIKECOIN_AMOUNT = '1000000000000000000'; // 1e18 wei === 1 LikeCoin

export const COSMOS_ENDPOINT = 'http://LIGHT_CLIENT_ENDPOINT/';
export const COSMOS_CHAIN_ID = 'CHAIN_ID';
export const COSMOS_GAS_PRICE = 1000.0;
export const COSMOS_DENOM = 'nanolike';
