const RETURN_TO_KEY = 'auth_return_to';

/**
 * Save the intended destination to return to after login
 * @param {string | {page: string, params: object}} pathOrPageData - Either a path string or an object with page and params
 */
export function saveReturnTo(pathOrPageData) {
  try {
    if (typeof pathOrPageData === 'string') {
      // If it's already a path, save it directly
      sessionStorage.setItem(RETURN_TO_KEY, pathOrPageData);
    } else {
      // If it's an object with page and params, convert to path
      const { page, params } = pathOrPageData;
      let path = '/';
      if (page === 'browse') path = '/browse';
      else if (page === 'creators') path = '/creators';
      else if (page === 'dashboard') path = '/dashboard';
      else if (page === 'upload') path = '/upload';
      else if (page === 'profile' && params && params.id) path = `/profile/${encodeURIComponent(params.id)}`;
      else if (page === 'detail' && params && params.id) path = `/command/${encodeURIComponent(params.id)}`;
      else if (page === 'edit' && params && params.id) path = `/command/${encodeURIComponent(params.id)}/edit`;
      sessionStorage.setItem(RETURN_TO_KEY, path);
    }
  } catch (e) {
    // ignore storage errors
  }
}

/**
 * Get the stored return destination
 * @returns {string | null} The stored path or null if none exists
 */
export function getReturnTo() {
  try {
    return sessionStorage.getItem(RETURN_TO_KEY);
  } catch (e) {
    return null;
  }
}

/**
 * Clear the stored return destination
 */
export function clearReturnTo() {
  try {
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch (e) {
    // ignore
  }
}
