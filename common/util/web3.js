export function isStatusSuccess(status) {
  if (typeof status === 'string') {
    switch (status) {
      case '0x1':
      case '1':
      case 'true':
        return true;
      default:
        return false;
    }
  } else {
    return !!status;
  }
}

export function isSameEthAddress(addr1, addr2) {
  const lowerAddr1 = addr1.toLowerCase();
  const lowerAddr2 = addr2.toLowerCase();
  if (lowerAddr1 === lowerAddr2) {
    return true;
  }
  const zeroAddressRegexp = /^0x0+$/;
  if (zeroAddressRegexp.test(addr1) && zeroAddressRegexp.test(addr2)) {
    return true;
  }
  return false;
}

export default isStatusSuccess;
