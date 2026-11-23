/**
 * Deeply sanitizes any payload destined for Cloud Firestore setDoc/updateDoc:
 * 1. Recursively strips any keys whose value is `undefined` (Firestore rejects `undefined` values).
 * 2. Preserves primitives (numbers, booleans, strings), nested maps, and arrays.
 * 3. Filters out `undefined` elements inside arrays.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }

  return cleanObj as T;
}

