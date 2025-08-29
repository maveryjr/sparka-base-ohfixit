import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  stories: ['../components/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-links'],
  docs: {},
  typescript: {
    // Use project tsconfig for path aliases
    // reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
