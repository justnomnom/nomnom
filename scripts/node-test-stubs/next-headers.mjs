/**
 * Node-test stub for `next/headers` (extensionless Next export).
 */
export async function cookies() {
  return {
    get() {
      return undefined;
    },
    getAll() {
      return [];
    },
    set() {},
    delete() {},
  };
}

export async function headers() {
  return new Headers();
}

export async function draftMode() {
  return { isEnabled: false };
}
