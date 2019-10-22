import { txCollection as dbRef } from '../util/firebase';
import { ETH_LOCK_ADDRESS } from '../constant';

let unsubscribeEthTx;
let ethTxHandler;
let successTxList = [];

function pollEthTx() {
  try {
    const watchRef = dbRef
      .where('to', '==', ETH_LOCK_ADDRESS)
      .where('status', '==', 'success')
      .where('cosmosMigrationTxHash', '==', '');
    const watch = () => {
      if (!unsubscribeEthTx) {
        unsubscribeEthTx = watchRef.onSnapshot(async (querySnapshot) => {
          if (querySnapshot.size) {
            successTxList = querySnapshot.docs.map((d) => ({
              from: d.from,
              to: d.to,
              type: d.type,
              status: d.status,
              cosmosAddreess: d.cosmosAddreess,
              tx: d.tx,
              value: d.value,
            }));
            if (ethTxHandler) {
              await Promise.all(querySnapshot.docs.map(async (d) => {
                try {
                  await ethTxHandler(d);
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error(err);
                }
              }));
            }
          }
        }, (err) => {
          console.error(err.message || err); // eslint-disable-line no-console
          if (typeof unsubscribeEthTx === 'function') {
            unsubscribeEthTx();
            unsubscribeEthTx = null;
          }
          const timer = setInterval(() => {
            console.log('Trying to restart watcher (eth tx)...'); // eslint-disable-line no-console
            try {
              watch();
              clearInterval(timer);
            } catch (innerErr) {
              console.log('Watcher restart failed (eth tx)'); // eslint-disable-line no-console
            }
          }, 10000);
        });
      }
    };
    watch();
  } catch (err) {
    const msg = err.message || err;
    console.error(msg); // eslint-disable-line no-console
  }
}

export function startPoller() {
  pollEthTx();
}

export function stopPoller() {
  if (typeof unsubscribeEthTx === 'function') {
    unsubscribeEthTx();
    unsubscribeEthTx = null;
  }
}

export function setEthTxHandler(handler) {
  ethTxHandler = handler;
}

export function getSuccessEthTxList() {
  return successTxList;
}
