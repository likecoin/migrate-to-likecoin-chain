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

export default isStatusSuccess;
