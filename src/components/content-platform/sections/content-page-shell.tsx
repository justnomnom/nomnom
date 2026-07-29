import type { ReactNode } from 'react';

import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import MainLayout from 'src/layouts/main';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { ContentArticleMarkdownBody } from 'src/components/content-platform/sections/content-article-markdown-body';
import {
  DASHBOARD_SPACE_TIGHT,
  dashboardPageSectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

export type BreadcrumbItem = { name: string; href: string };

type ContentPageShellProps = {
  title: string;
  description?: string;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
  /**
   * When false, children render without the client StyledMarkdown wrapper (use for MUI-only shells).
   * MDX and raw HTML prose should keep the default true.
   */
  markdownBody?: boolean;
};

/**
 * Article layout for MDX and marketing content — matches /post chrome (MainLayout header + blog column width).
 */
export function ContentPageShell({
  title,
  description,
  breadcrumbs,
  children,
  markdownBody = true,
}: ContentPageShellProps) {
  return (
    <MainLayout>
      <Container
        maxWidth={false}
        sx={{
          pt: { xs: 4, sm: 3, md: 4 },
          pb: 2,
          mb: 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <CustomBreadcrumbs links={breadcrumbs} sx={{ maxWidth: 720, mx: 'auto' }} />
      </Container>

      <Container maxWidth={false}>
        <Stack {...dashboardPageSectionStackProps} sx={{ maxWidth: 720, mx: 'auto', pb: 4 }}>
          <Stack spacing={DASHBOARD_SPACE_TIGHT}>
            <Typography variant="h3" component="h1">
              {title}
            </Typography>
            {description ? (
              <Typography variant="subtitle1" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Stack>

          {markdownBody ? (
            <ContentArticleMarkdownBody>{children}</ContentArticleMarkdownBody>
          ) : (
            children
          )}
        </Stack>
      </Container>
    </MainLayout>
  );
}
