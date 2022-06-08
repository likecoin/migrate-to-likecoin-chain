export function isValidLikeOrCosmosWallet(str) {
  return !!str.match(/^(cosmos|like)1[ac-hj-np-z02-9]{38}$/);
}

export default isValidLikeOrCosmosWallet;
