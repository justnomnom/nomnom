import useSWR from 'swr';
import { useMemo } from 'react';

// ----------------------------------------------------------------------

const blogFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error('Blog request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
};

// ----------------------------------------------------------------------

export function useGetPosts() {
  const URL = '/api/posts?limit=20';

  const { data, isLoading, error, isValidating } = useSWR(URL, blogFetcher);

  const memoizedValue = useMemo(
    () => ({
      posts: data?.posts || [],
      postsLoading: isLoading,
      postsError: error,
      postsValidating: isValidating,
      postsEmpty: !isLoading && !data?.posts?.length,
    }),
    [data?.posts, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetPost(title) {
  const URL = title ? `/api/posts?title=${encodeURIComponent(title)}` : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, blogFetcher);

  const memoizedValue = useMemo(
    () => ({
      post: data?.post || null,
      postLoading: isLoading,
      postError: error,
      postValidating: isValidating,
    }),
    [data?.post, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetLatestPosts(title) {
  const URL = title ? `/api/posts/latest?title=${encodeURIComponent(title)}&limit=4` : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, blogFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });

  const memoizedValue = useMemo(
    () => ({
      latestPosts: data?.latestPosts || [],
      latestPostsLoading: isLoading,
      latestPostsError: error,
      latestPostsValidating: isValidating,
      latestPostsEmpty: !isLoading && !data?.latestPosts?.length,
    }),
    [data?.latestPosts, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useSearchPosts(query) {
  const URL = query ? `/api/posts/search?query=${encodeURIComponent(query)}&limit=10` : null;

  const { data, isLoading, error, isValidating } = useSWR(URL, blogFetcher, {
    keepPreviousData: true,
  });

  const memoizedValue = useMemo(
    () => ({
      searchResults: data?.results || [],
      searchLoading: isLoading,
      searchError: error,
      searchValidating: isValidating,
      searchEmpty: !isLoading && !data?.results?.length,
    }),
    [data?.results, error, isLoading, isValidating]
  );

  return memoizedValue;
}
