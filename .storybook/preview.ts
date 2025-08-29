import type { Preview } from '@storybook/react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    layout: 'padded',
    // SB9 recommends tags-based organization; leaving storySort off
  },
};

export default preview;
