/** No-op Next cache APIs so Node unit tests can import `'use server'` modules. */
export function revalidatePath() {}

export function revalidateTag() {}

export function unstable_cache(cb) {
  return cb;
}

export function unstable_noStore() {}
