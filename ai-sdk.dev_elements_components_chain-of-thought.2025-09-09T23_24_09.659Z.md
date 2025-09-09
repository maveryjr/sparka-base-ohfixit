[AI SDK](https://ai-sdk.dev/)

v5

Search…
`⌘ K`

Feedback

Sign in with Vercel

Sign in with Vercel

Menu

[Introduction](https://ai-sdk.dev/elements/overview)

[Setup](https://ai-sdk.dev/elements/overview/setup)

[Usage](https://ai-sdk.dev/elements/overview/usage)

[Troubleshooting](https://ai-sdk.dev/elements/overview/troubleshooting)

[Examples](https://ai-sdk.dev/elements/examples)

[Chatbot](https://ai-sdk.dev/elements/examples/chatbot)

[v0 clone](https://ai-sdk.dev/elements/examples/v0)

[Components](https://ai-sdk.dev/elements/components)

[Actions](https://ai-sdk.dev/elements/components/actions)

[Artifact](https://ai-sdk.dev/elements/components/artifact)

[Branch](https://ai-sdk.dev/elements/components/branch)

[Chain of Thought](https://ai-sdk.dev/elements/components/chain-of-thought)

[Code Block](https://ai-sdk.dev/elements/components/code-block)

[Context](https://ai-sdk.dev/elements/components/context)

[Conversation](https://ai-sdk.dev/elements/components/conversation)

[Image](https://ai-sdk.dev/elements/components/image)

[Inline Citation](https://ai-sdk.dev/elements/components/inline-citation)

[Loader](https://ai-sdk.dev/elements/components/loader)

[Message](https://ai-sdk.dev/elements/components/message)

[Open In Chat](https://ai-sdk.dev/elements/components/open-in-chat)

[Prompt Input](https://ai-sdk.dev/elements/components/prompt-input)

[Reasoning](https://ai-sdk.dev/elements/components/reasoning)

[Response](https://ai-sdk.dev/elements/components/response)

[Sources](https://ai-sdk.dev/elements/components/sources)

[Suggestion](https://ai-sdk.dev/elements/components/suggestion)

[Task](https://ai-sdk.dev/elements/components/task)

[Tool](https://ai-sdk.dev/elements/components/tool)

[Web Preview](https://ai-sdk.dev/elements/components/web-preview)

Copy markdown

# [Chain of Thought](https://ai-sdk.dev/elements/components/chain-of-thought\#chain-of-thought)

The `ChainOfThought` component provides a visual representation of an AI's reasoning process, showing step-by-step thinking with support for search results, images, and progress indicators. It helps users understand how AI arrives at conclusions.

Chain of Thought

Searching for profiles for Hayden Bleasel

![](https://ai-sdk.dev/_next/image?url=https%3A%2F%2Fimg.logo.dev%2Fwww.x.com%3Ftoken%3Dpk_WvmDV4TyQzGbpcnwL6tImw&w=32&q=75&dpl=dpl_HPuAWSTEqs452ZqV8SCRvWMGA8E2)www.x.com

![](https://ai-sdk.dev/_next/image?url=https%3A%2F%2Fimg.logo.dev%2Fwww.instagram.com%3Ftoken%3Dpk_WvmDV4TyQzGbpcnwL6tImw&w=32&q=75&dpl=dpl_HPuAWSTEqs452ZqV8SCRvWMGA8E2)www.instagram.com

![](https://ai-sdk.dev/_next/image?url=https%3A%2F%2Fimg.logo.dev%2Fwww.github.com%3Ftoken%3Dpk_WvmDV4TyQzGbpcnwL6tImw&w=32&q=75&dpl=dpl_HPuAWSTEqs452ZqV8SCRvWMGA8E2)www.github.com

## [Installation](https://ai-sdk.dev/elements/components/chain-of-thought\#installation)

ai-elementsshadcn (registry)shadcnManual

```
npx ai-elements@latest add chain-of-thought
```

## [Usage](https://ai-sdk.dev/elements/components/chain-of-thought\#usage)

```code-block_code__yIKW2

import {

  ChainOfThought,

  ChainOfThoughtContent,

  ChainOfThoughtHeader,

  ChainOfThoughtImage,

  ChainOfThoughtSearchResult,

  ChainOfThoughtSearchResults,

  ChainOfThoughtStep,

} from '@/components/ai-elements/chain-of-thought';
```

```code-block_code__yIKW2

<ChainOfThought defaultOpen>

  <ChainOfThoughtHeader />

  <ChainOfThoughtContent>

    <ChainOfThoughtStep

      icon={SearchIcon}

      label="Searching for information"

      status="complete"

    >

      <ChainOfThoughtSearchResults>

        <ChainOfThoughtSearchResult>

          Result 1

        </ChainOfThoughtSearchResult>

      </ChainOfThoughtSearchResults>

    </ChainOfThoughtStep>

  </ChainOfThoughtContent>

</ChainOfThought>
```

## [Features](https://ai-sdk.dev/elements/components/chain-of-thought\#features)

- Collapsible interface with smooth animations powered by Radix UI
- Step-by-step visualization of AI reasoning process
- Support for different step statuses (complete, active, pending)
- Built-in search results display with badge styling
- Image support with captions for visual content
- Custom icons for different step types
- Context-aware components using React Context API
- Fully typed with TypeScript
- Accessible with keyboard navigation support
- Responsive design that adapts to different screen sizes
- Smooth fade and slide animations for content transitions
- Composable architecture for flexible customization

## [Props](https://ai-sdk.dev/elements/components/chain-of-thought\#props)

### [`<ChainOfThought />`](https://ai-sdk.dev/elements/components/chain-of-thought\#chainofthought-)

### open?:

boolean

Controlled open state of the collapsible.

### defaultOpen?:

boolean

Default open state when uncontrolled. Defaults to false.

### onOpenChange?:

(open: boolean) => void

Callback when the open state changes.

### \[...props\]?:

React.ComponentProps<"div">

Any other props are spread to the root div element.

### [`<ChainOfThoughtHeader />`](https://ai-sdk.dev/elements/components/chain-of-thought\#chainofthoughtheader-)

### children?:

React.ReactNode

Custom header text. Defaults to "Chain of Thought".

### \[...props\]?:

React.ComponentProps<typeof CollapsibleTrigger>

Any other props are spread to the CollapsibleTrigger component.

### [`<ChainOfThoughtStep />`](https://ai-sdk.dev/elements/components/chain-of-thought\#chainofthoughtstep-)

### icon?:

LucideIcon

Icon to display for the step. Defaults to DotIcon.

### label:

string

The main text label for the step.

### description?:

string

Optional description text shown below the label.

### status?:

"complete" \| "active" \| "pending"

Visual status of the step. Defaults to "complete".

### \[...props\]?:

React.ComponentProps<"div">

Any other props are spread to the root div element.

### [`<ChainOfThoughtSearchResults />`](https://ai-sdk.dev/elements/components/chain-of-thought\#chainofthoughtsearchresults-)

### \[...props\]?:

React.ComponentProps<"div">

Any props are spread to the container div element.

### [`<ChainOfThoughtSearchResult />`](https://ai-sdk.dev/elements/components/chain-of-thought\#chainofthoughtsearchresult-)

### \[...props\]?:

React.ComponentProps<typeof Badge>

Any props are spread to the Badge component.

### [`<ChainOfThoughtContent />`](https://ai-sdk.dev/elements/components/chain-of-thought\#chainofthoughtcontent-)

### \[...props\]?:

React.ComponentProps<typeof CollapsibleContent>

Any props are spread to the CollapsibleContent component.

### [`<ChainOfThoughtImage />`](https://ai-sdk.dev/elements/components/chain-of-thought\#chainofthoughtimage-)

### caption?:

string

Optional caption text displayed below the image.

### \[...props\]?:

React.ComponentProps<"div">

Any other props are spread to the container div element.

On this page

[Chain of Thought](https://ai-sdk.dev/elements/components/chain-of-thought#chain-of-thought)

[Installation](https://ai-sdk.dev/elements/components/chain-of-thought#installation)

[Usage](https://ai-sdk.dev/elements/components/chain-of-thought#usage)

[Features](https://ai-sdk.dev/elements/components/chain-of-thought#features)

[Props](https://ai-sdk.dev/elements/components/chain-of-thought#props)

[<ChainOfThought />](https://ai-sdk.dev/elements/components/chain-of-thought#chainofthought-)

[<ChainOfThoughtHeader />](https://ai-sdk.dev/elements/components/chain-of-thought#chainofthoughtheader-)

[<ChainOfThoughtStep />](https://ai-sdk.dev/elements/components/chain-of-thought#chainofthoughtstep-)

[<ChainOfThoughtSearchResults />](https://ai-sdk.dev/elements/components/chain-of-thought#chainofthoughtsearchresults-)

[<ChainOfThoughtSearchResult />](https://ai-sdk.dev/elements/components/chain-of-thought#chainofthoughtsearchresult-)

[<ChainOfThoughtContent />](https://ai-sdk.dev/elements/components/chain-of-thought#chainofthoughtcontent-)

[<ChainOfThoughtImage />](https://ai-sdk.dev/elements/components/chain-of-thought#chainofthoughtimage-)

Deploy and Scale AI Apps with Vercel.

Vercel delivers the infrastructure and developer experience you need to ship reliable AI-powered applications at scale.

Trusted by industry leaders:

- OpenAI
- Photoroom
- ![leonardo-ai Logo](https://ai-sdk.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-leonardo-ai-light.526e111b.svg&w=384&q=75&dpl=dpl_HPuAWSTEqs452ZqV8SCRvWMGA8E2)![leonardo-ai Logo](https://ai-sdk.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-leonardo-ai-dark.8b6b14e3.svg&w=384&q=75&dpl=dpl_HPuAWSTEqs452ZqV8SCRvWMGA8E2)
- ![zapier Logo](https://ai-sdk.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-zapier-light.7b452767.svg&w=256&q=75&dpl=dpl_HPuAWSTEqs452ZqV8SCRvWMGA8E2)![zapier Logo](https://ai-sdk.dev/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo-zapier-dark.bfd8e374.svg&w=256&q=75&dpl=dpl_HPuAWSTEqs452ZqV8SCRvWMGA8E2)

[Talk to an expert](https://vercel.com/contact/sales?utm_source=ai_sdk&utm_medium=web&utm_campaign=contact_sales_cta&utm_content=talk_to_an_expert_sdk_docs)