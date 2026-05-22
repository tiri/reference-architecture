export { default as Badge }    from './Badge';
export { default as Card }     from './Card';
export { default as Skeleton } from './Skeleton';
export { default as StatCard } from './StatCard';

/**
 * Show a slide-in notification. Dispatches 'portal:notification' so it works
 * in any embedded domain app without additional setup.
 *
 * @param {number} status  HTTP status code (or 0 for network errors)
 * @param {string} [message]  Override the default message for this status
 */
export function notify(status, message) {
  window.dispatchEvent(new CustomEvent('portal:notification', {
    detail: { status, message },
  }));
}
