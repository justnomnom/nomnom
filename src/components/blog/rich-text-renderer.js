import React from 'react';
import PropTypes from 'prop-types';

import { alpha } from '@mui/material/styles';
import { Box, List, ListItem, Typography, ListItemText } from '@mui/material';

import { useTranslate } from 'src/locales';

export function RichTextRenderer({ content }) {
  const { t } = useTranslate();

  if (!content) return null;

  const renderNode = (node, index) => {
    if (!node) return null;

    switch (node.type) {
      case 'paragraph':
        return (
          <Typography key={index} variant="body1" component="p" sx={{ mb: 1.5 }}>
            {node.children?.map((child, childIndex) => renderInline(child, childIndex))}
          </Typography>
        );

      case 'heading': {
        let headingVariant = 'h2';
        if (node.tag === 'h1') headingVariant = 'h2';
        else if (node.tag === 'h2') headingVariant = 'h3';
        else if (node.tag === 'h3') headingVariant = 'h4';
        else if (node.tag === 'h4') headingVariant = 'h5';

        return (
          <Typography
            key={index}
            variant={headingVariant}
            component={node.tag || 'h2'}
            sx={{ mt: 2, mb: 1.5 }}
          >
            {node.children?.map((child, childIndex) => renderInline(child, childIndex))}
          </Typography>
        );
      }

      case 'list': {
        const ListComponent = node.listType === 'number' ? 'ol' : 'ul';
        return (
          <List key={index} component={ListComponent} sx={{ mb: 1.5 }}>
            {node.children?.map((child, childIndex) => renderNode(child, childIndex))}
          </List>
        );
      }

      case 'listitem':
        return (
          <ListItem key={index} sx={{ display: 'list-item', py: 0 }}>
            <ListItemText>
              {node.children?.map((child, childIndex) => renderNode(child, childIndex))}
            </ListItemText>
          </ListItem>
        );

      case 'quote':
        return (
          <Box
            key={index}
            component="blockquote"
            sx={(theme) => ({
              border: 1,
              borderStyle: 'solid',
              borderColor: alpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.42 : 0.28
              ),
              borderRadius: 1,
              pl: 2,
              py: 1,
              my: 1.5,
              bgcolor: alpha(
                theme.palette.primary.main,
                theme.palette.mode === 'dark' ? 0.08 : 0.04
              ),
              fontStyle: 'italic',
            })}
          >
            {node.children?.map((child, childIndex) => renderNode(child, childIndex))}
          </Box>
        );

      case 'link':
        return (
          <Typography
            key={index}
            component="a"
            href={node.url}
            target={node.newTab ? '_blank' : undefined}
            rel={node.newTab ? 'noopener noreferrer' : undefined}
            sx={{
              color: 'primary.main',
              textDecoration: 'underline',
              '&:hover': {
                textDecoration: 'none',
              },
            }}
          >
            {node.children?.map((child, childIndex) => renderInline(child, childIndex))}
          </Typography>
        );

      default:
        if (node.children) {
          return node.children.map((child, childIndex) => renderNode(child, childIndex));
        }
        return null;
    }
  };

  const renderInline = (node, index) => {
    if (typeof node === 'string') {
      return node;
    }

    if (node.text !== undefined) {
      let { text } = node;

      if (node.bold) {
        text = <strong key={index}>{text}</strong>;
      }
      if (node.italic) {
        text = <em key={index}>{text}</em>;
      }
      if (node.underline) {
        text = <u key={index}>{text}</u>;
      }
      if (node.strikethrough) {
        text = <s key={index}>{text}</s>;
      }

      return text;
    }

    return renderNode(node, index);
  };

  if (typeof content === 'string') {
    return (
      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
        {content}
      </Typography>
    );
  }

  if (Array.isArray(content)) {
    return <Box>{content.map((node, index) => renderNode(node, index))}</Box>;
  }

  if (content.root && Array.isArray(content.root.children)) {
    return <Box>{content.root.children.map((node, index) => renderNode(node, index))}</Box>;
  }

  return (
    <Typography variant="body1">{t('components.blog.content_format_not_supported')}</Typography>
  );
}

RichTextRenderer.propTypes = {
  content: PropTypes.oneOfType([PropTypes.array, PropTypes.object, PropTypes.string]),
};
