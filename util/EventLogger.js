export function logTrackerEvent(vue, category, action, label, value) {
  try {
    // do not track
    if (window.doNotTrack || navigator.doNotTrack) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'customEvent',
      category,
      action,
      label,
      value,
    });
  } catch (err) {
    console.error('logging error:'); // eslint-disable-line no-console
    console.error(err); // eslint-disable-line no-console
  }
}

export default logTrackerEvent;
