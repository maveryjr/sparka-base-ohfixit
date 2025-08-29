import type { Meta, StoryObj } from '@storybook/react';
import { Response } from './response';

const meta: Meta<typeof Response> = {
  title: 'Components/AI/Response',
  component: Response,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="bg-background p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Response>;

const sampleMarkdown = `
# Markdown syntax guide

## Headers

# This is a Heading h1
## This is a Heading h2
### This is a Heading h3
#### This is a Heading h4
##### This is a Heading h5
###### This is a Heading h6

## Paragraphs

This is a paragraph.

This is another paragraph.



## Emphasis

*This text will be italic*  
_This will also be italic_

**This text will be bold**  
__This will also be bold__


_You **can** combine them_

## Lists

### Unordered

* Item 1
* Item 2
* Item 2a
* Item 2b

### Ordered

1. Item 1
2. Item 2
3. Item 3
    1. Item 3a
    2. Item 3b

## Images

![This is an alt text.](https://picsum.photos/id/237/200/300
 "This is a sample image.")

## Links

You may be using [Markdown Live Preview](https://markdownlivepreview.com/).

## Blockquotes

> Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
>
>> Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

## Tables

| Left columns  | Right columns |
| ------------- |:-------------:|
| left foo      | right foo     |
| left bar      | right bar     |
| left baz      | right baz     |

## Blocks of code

\`\`\`ts
let message = 'Hello world';
alert(message);
\`\`\`

## Inline code

This web site is using \`markedjs/marked\`.

## Horizontal Rule

Above

---

Below


`;

export const Default: Story = {
  args: {
    children: sampleMarkdown,
  },
};

const sampleGfmMarkdown = `
# GFM extensions demo

## Strikethrough

This is ~~struck through~~ but this is not.

## Task lists

- [x] Completed item
- [ ] Incomplete item
  - [x] Nested complete
  - [ ] Nested incomplete

## Tables with alignment

| Left align | Center align | Right align |
|:-----------|:------------:|------------:|
| left       |   center     |       right |
| foo        |     bar      |         baz |

## Autolink literals

Visit https://example.com or www.example.com and email <user@example.com>.

## Footnotes

Here is a reference to a footnote.[^1] Another one with inline code[^code].

[^1]: This is the footnote definition supporting full markdown.
[^code]: Footnote with \`inline code\` and a [link](https://example.com).

`;

const emailExample = `  
Subject: Quick Update

Hi [Recipient's Name],

I hope this message finds you well. I wanted to share a few quick updates:

- **Project Status**: We are currently on track to meet our deadlines.
- **Upcoming Meetings**: Please mark your calendars for our next team meeting on [Date and Time].
- **Action Items**: Don't forget to review the latest documents shared in the drive.

Let me know if you have any questions.

Best regards,

[Your Name]  
[Your Position]  
[Your Contact Information]  

`;

export const GFM: Story = {
  args: {
    children: sampleGfmMarkdown,
  },
};

export const Email: Story = {
  args: {
    children: emailExample,
  },
};
