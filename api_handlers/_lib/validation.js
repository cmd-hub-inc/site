/**
 * Input validation and sanitization utilities
 */

// Sanitize string input
export function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

// Validate command name
export function validateCommandName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Command name is required' };
  }
  const trimmed = sanitizeString(name, 100);
  if (trimmed.length < 1) {
    return { valid: false, error: 'Command name cannot be empty' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Command name must be 100 characters or less' };
  }
  if (!/^[a-zA-Z0-9\-_\s]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Command name can only contain letters, numbers, hyphens, and underscores',
    };
  }
  return { valid: true, value: trimmed };
}

// Validate description
export function validateDescription(desc) {
  if (!desc || typeof desc !== 'string') {
    return { valid: false, error: 'Description is required' };
  }
  const trimmed = sanitizeString(desc, 1000);
  if (trimmed.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters' };
  }
  if (trimmed.length > 1000) {
    return { valid: false, error: 'Description must be 1000 characters or less' };
  }
  return { valid: true, value: trimmed };
}

// Validate tags
export function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return { valid: false, error: 'Tags must be an array' };
  }
  if (tags.length > 10) {
    return { valid: false, error: 'Maximum 10 tags allowed' };
  }
  const sanitized = tags.map((t) => sanitizeString(t, 50)).filter(Boolean);
  if (sanitized.length !== tags.length) {
    return { valid: false, error: 'All tags must be non-empty strings' };
  }
  return { valid: true, value: sanitized };
}

// Validate framework
export function validateFramework(framework, validFrameworks) {
  if (!framework || typeof framework !== 'string') {
    return { valid: false, error: 'Framework is required' };
  }
  if (!validFrameworks.includes(framework)) {
    return { valid: false, error: `Framework must be one of: ${validFrameworks.join(', ')}` };
  }
  return { valid: true, value: framework };
}

// Validate type
export function validateType(type, validTypes) {
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Type is required' };
  }
  if (!validTypes.includes(type)) {
    return { valid: false, error: `Type must be one of: ${validTypes.join(', ')}` };
  }
  return { valid: true, value: type };
}

// Validate URL
export function validateUrl(url) {
  if (!url) return { valid: true, value: null };
  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }
  try {
    new URL(url);
    return { valid: true, value: url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Validate rating value
export function validateRating(value) {
  if (typeof value !== 'number') {
    return { valid: false, error: 'Rating must be a number' };
  }
  if (value < 1 || value > 5) {
    return { valid: false, error: 'Rating must be between 1 and 5' };
  }
  return { valid: true, value: Math.round(value) };
}

// Validate page number
export function validatePage(page) {
  const num = parseInt(page, 10);
  if (isNaN(num) || num < 1) {
    return { valid: false, error: 'Page must be a positive integer' };
  }
  return { valid: true, value: num };
}

// Validate limit
export function validateLimit(limit, maxLimit = 100) {
  const num = parseInt(limit, 10);
  if (isNaN(num) || num < 1) {
    return { valid: false, error: 'Limit must be a positive integer' };
  }
  if (num > maxLimit) {
    return { valid: false, error: `Limit must be ${maxLimit} or less` };
  }
  return { valid: true, value: num };
}

// Validate search query
export function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: true, value: '' };
  }
  const trimmed = sanitizeString(query, 200);
  return { valid: true, value: trimmed };
}

// Validate sort field
export function validateSortField(field, validFields) {
  if (!field || typeof field !== 'string') {
    return { valid: false, error: 'Sort field is required' };
  }
  if (!validFields.includes(field)) {
    return { valid: false, error: `Sort field must be one of: ${validFields.join(', ')}` };
  }
  return { valid: true, value: field };
}

// Validate sort order
export function validateSortOrder(order) {
  if (!order || typeof order !== 'string') {
    return { valid: false, error: 'Sort order is required' };
  }
  if (!['asc', 'desc'].includes(order)) {
    return { valid: false, error: 'Sort order must be asc or desc' };
  }
  return { valid: true, value: order };
}
