import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

export type CustomBreadcrumbLink = {
  name: string;
  href?: string;
  icon?: ReactNode;
};

export interface CustomBreadcrumbsProps {
  links: CustomBreadcrumbLink[];
  action?: ReactNode;
  heading?: string;
  moreLink?: string[];
  activeLast?: boolean;
  sx?: SxProps<Theme>;
}

declare function CustomBreadcrumbs(props: CustomBreadcrumbsProps): React.ReactElement;

export default CustomBreadcrumbs;
