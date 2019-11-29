export const { IS_TESTNET } = process.env;

export const ETH_LOCK_ADDRESS = IS_TESTNET ? '0xc3f7f5E7780390ca2A747519B14D80B206f81CD9' : '0xE82B754C77c2e2d6013DAdcF19D35Ff66280e076';

export const ETH_MIN_LIKECOIN_AMOUNT = '1000000000000000000';

export const ETH_CONFIRMATION_NEEDED = IS_TESTNET ? 2 : 12;

export const ETH_ENDPOINT = IS_TESTNET ? 'https://rinkeby.infura.io/v3/53c151ea15184dc69ea07b4d2041ba4e' : 'https://mainnet.infura.io/v3/3981482524b045a2a5d4f539c07c2cc6';

export const LIKECO_HOST = IS_TESTNET ? 'https://rinkeby.like.co' : 'https://like.co';

export const COSMOS_MIGRATION_ADDRESS = IS_TESTNET ? 'cosmos1cj3td9eqncjq86cncl5h68zhldurjvxacpa8rp' : 'cosmos1mkdu4m7qad7yec6uayed8hec4xj2gj8dp56fhz';
