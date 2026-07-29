'use client';

import type { ReactNode } from 'react';

import StyledMarkdown from 'src/components/markdown/styles';

type Props = {
  children: ReactNode;
};

/**
 * Client boundary: `StyledMarkdown` uses MUI `styled()` and cannot run in RSC.
 */
export function ContentArticleMarkdownBody({ children }: Props) {
  return <StyledMarkdown>{children}</StyledMarkdown>;
}
