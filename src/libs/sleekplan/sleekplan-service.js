/**
 * Sleekplan service for managing user data and widget operations
 */
import { SLEEKPLAN_API, INTEGRATION_FLAGS } from 'src/config-global';

/**
 * Initialize Sleekplan SDK and global variables
 */
export const initializeSleekplan = () => {
  if (typeof window === 'undefined' || !INTEGRATION_FLAGS.sleekplan) return;

  try {
    // Ensure Sleekplan command queue exists
    window.$sleek = window.$sleek || [];

    // Set product ID from config
    window.SLEEK_PRODUCT_ID = SLEEKPLAN_API.productId;

    // Configure Sleekplan settings before loading SDK
    // This prevents auto-initialization issues and X-Frame-Options errors
    window.SLEEK_SETTINGS = {
      // Set the product ID
      productId: SLEEKPLAN_API.productId,
      // Enable launcher button so widget appears
      launcher: true,
      // Ensure we're using the widget mode, not iframe mode
      mode: 'widget',
    };

    // Load SDK script
    const script = document.createElement('script');
    script.src = SLEEKPLAN_API.sdkUrl;
    script.async = true;
    document.getElementsByTagName('head')[0].appendChild(script);

    // Sleekplan SDK initialization completed
  } catch (error) {
    logger.error('Failed to initialize Sleekplan SDK', { error: error.message });
  }
};

// Logger helper - matches the pattern from auth actions
const logger = {
  error: (message, data = {}) => {
    console.error('[sleekplan-service.js]', message, data);
  },
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[sleekplan-service.js]', message, data);
    }
  },
};

/**
 * Set user data in Sleekplan - called from auth actions
 * @param {Object} userData - User data object
 * @param {string} userData.id - User ID
 * @param {string} userData.email - User email
 * @param {string} userData.displayName - User display name
 */
export const setSleekplanUser = (userData) => {
  if (typeof window === 'undefined' || !INTEGRATION_FLAGS.sleekplan) return;

  try {
    if (!userData) {
      // Clear user data
      if (window.$sleek && typeof window.$sleek.setUser === 'function') {
        // SDK is loaded, use direct method
        window.$sleek.setUser(null);
      } else {
        // SDK not ready, queue the command
        window.$sleek = window.$sleek || [];
        window.$sleek.push(['setUser', null]);
      }
      return;
    }

    const sleekplanUserData = {
      mail: userData.email,
      id: userData.id,
      name: userData.displayName,
      subscription: 'free',
    };

    if (window.$sleek && typeof window.$sleek.setUser === 'function') {
      // SDK is loaded, use direct method
      window.$sleek.setUser(sleekplanUserData);
    } else {
      // SDK not ready, queue the command
      window.$sleek = window.$sleek || [];
      window.$sleek.push(['setUser', sleekplanUserData]);
    }
  } catch (error) {
    logger.error('Failed to set Sleekplan user', {
      error: error.message,
      userId: userData?.id,
    });
  }
};

/**
 * Shutdown Sleekplan SDK - clears all user data and removes the widget
 * Should be called when users logout to clear cookies and session data
 */
export const shutdownSleekplan = () => {
  if (typeof window === 'undefined' || !INTEGRATION_FLAGS.sleekplan) return;

  try {
    if (window.$sleek && typeof window.$sleek.resetUser === 'function') {
      // SDK is loaded, use resetUser method (this clears user data and session)
      window.$sleek.resetUser();
    } else if (window.$sleek && typeof window.$sleek.setUser === 'function') {
      // Fallback to setUser(null) if resetUser doesn't exist
      window.$sleek.setUser(null);
    } else {
      // SDK not ready, queue the command
      window.$sleek = window.$sleek || [];
      window.$sleek.push(['resetUser']);
    }
  } catch (error) {
    logger.error('Failed to shutdown Sleekplan', { error: error.message });
  }
};

/**
 * Build the Sleekplan hosted feedback portal URL (open in a new tab).
 * Note: GET responses currently send X-Frame-Options: SAMEORIGIN, so this
 * URL must not be used inside an iframe — use openSleekplanWidget() in-app.
 * @param {Object} options
 * @param {string} [options.productId] - Optional product ID override
 * @returns {string} Portal URL
 */
export const getSleekplanFeedbackUrl = ({ productId } = {}) => {
  if (!INTEGRATION_FLAGS.sleekplan) {
    return '';
  }
  const pid = productId || SLEEKPLAN_API.productId;
  return `https://embed-${pid}.sleekplan.app/feedback?full=true`;
};

/**
 * Open the Sleekplan JS widget to a specific view (in-app feedback).
 * Prefer this over iframe embeds — the hosted portal blocks framing.
 * @param {string} [view='home'] - Widget view (e.g. 'home', 'feedback.add')
 */
export const openSleekplanWidget = (view = 'home') => {
  if (typeof window === 'undefined' || !INTEGRATION_FLAGS.sleekplan) return;

  try {
    if (window.$sleek && typeof window.$sleek.open === 'function') {
      window.$sleek.open(view);
      return;
    }
    window.$sleek = window.$sleek || [];
    window.$sleek.push(['open', view]);
  } catch (error) {
    logger.error('Failed to open Sleekplan widget', { error: error.message, view });
  }
};
