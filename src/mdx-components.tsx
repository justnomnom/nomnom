import type { MDXComponents } from 'mdx/types';

import { getMdxComponents } from '@/content-platform/mdx-components';

/**
 * Global MDX components for `@next/mdx` when importing `.mdx` as pages/modules.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...getMdxComponents(),
    ...components,
  };
}
