'use client'

import { useControllableState } from '@radix-ui/react-use-controllable-state'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ChevronDownIcon,
  DotIcon,
  ImageIcon,
  ListTreeIcon,
  SearchIcon,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import type { ComponentProps, ReactNode } from 'react'
import { createContext, memo, useContext } from 'react'

type ChainOfThoughtContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null,
)

const useChainOfThought = () => {
  const ctx = useContext(ChainOfThoughtContext)
  if (!ctx) throw new Error('ChainOfThought.* must be used within ChainOfThought')
  return ctx
}

export type ChainOfThoughtProps = ComponentProps<'div'> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export const ChainOfThought = memo(function ChainOfThought({
  className,
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ChainOfThoughtProps) {
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  return (
    <ChainOfThoughtContext.Provider value={{ open, setOpen }}>
      <Collapsible open={open} onOpenChange={setOpen} asChild>
        <div className={cn('not-prose mb-4', className)} {...props}>
          {children}
        </div>
      </Collapsible>
    </ChainOfThoughtContext.Provider>
  )
})

export type ChainOfThoughtHeaderProps = ComponentProps<typeof CollapsibleTrigger> & {
  children?: ReactNode
}

export const ChainOfThoughtHeader = memo(function ChainOfThoughtHeader({
  className,
  children,
  ...props
}: ChainOfThoughtHeaderProps) {
  const { open } = useChainOfThought()
  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full items-center gap-2 text-muted-foreground text-sm',
        className,
      )}
      {...props}
    >
      <ListTreeIcon className="size-4" />
      {children ?? <p className="text-base font-medium">Chain of Thought</p>}
      <ChevronDownIcon
        className={cn(
          'ml-auto size-4 text-muted-foreground transition-transform',
          open ? 'rotate-180' : 'rotate-0',
        )}
      />
    </CollapsibleTrigger>
  )
})

export type ChainOfThoughtContentProps = ComponentProps<typeof CollapsibleContent>

export const ChainOfThoughtContent = memo(function ChainOfThoughtContent({
  className,
  children,
  ...props
}: ChainOfThoughtContentProps) {
  return (
    <CollapsibleContent
      className={cn(
        'mt-4 text-sm',
        'text-popover-foreground outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-3">{children}</div>
    </CollapsibleContent>
  )
})

export type ChainOfThoughtStepProps = ComponentProps<'div'> & {
  icon?: LucideIcon
  label: string
  description?: string
  status?: 'complete' | 'active' | 'pending'
}

export const ChainOfThoughtStep = memo(function ChainOfThoughtStep({
  className,
  icon: Icon = DotIcon,
  label,
  description,
  status = 'complete',
  ...props
}: ChainOfThoughtStepProps) {
  const statusClasses =
    status === 'active'
      ? 'border-primary/40 bg-primary/5'
      : status === 'pending'
        ? 'opacity-80'
        : ''

  return (
    <div className={cn('flex items-start gap-3 rounded-md p-2', statusClasses, className)} {...props}>
      <Icon className={cn('mt-0.5 size-4', status === 'pending' ? 'opacity-60' : '')} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-5">{label}</div>
        {description && (
          <div className="text-muted-foreground text-sm leading-5">{description}</div>
        )}
      </div>
    </div>
  )
})

export type ChainOfThoughtSearchResultsProps = ComponentProps<'div'>

export const ChainOfThoughtSearchResults = memo(function ChainOfThoughtSearchResults({
  className,
  children,
  ...props
}: ChainOfThoughtSearchResultsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} {...props}>
      {children}
    </div>
  )
})

export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>

export const ChainOfThoughtSearchResult = memo(function ChainOfThoughtSearchResult({
  className,
  children,
  ...props
}: ChainOfThoughtSearchResultProps) {
  return (
    <Badge variant="outline" className={cn('gap-2', className)} {...(props as any)}>
      {children}
    </Badge>
  )
})

export type ChainOfThoughtImageProps = ComponentProps<'div'> & {
  src?: string
  alt?: string
  caption?: string
  width?: number
  height?: number
}

export const ChainOfThoughtImage = memo(function ChainOfThoughtImage({
  className,
  src,
  alt,
  caption,
  width = 240,
  height = 160,
  ...props
}: ChainOfThoughtImageProps) {
  return (
    <div className={cn('flex flex-col items-start gap-1', className)} {...props}>
      <div className="relative overflow-hidden rounded-md border">
        {src ? (
          <Image src={src} alt={alt ?? ''} width={width} height={height} />
        ) : (
          <div className="flex h-[160px] w-[240px] items-center justify-center text-muted-foreground">
            <ImageIcon className="size-6" />
          </div>
        )}
      </div>
      {caption && (
        <div className="text-muted-foreground text-xs">{caption}</div>
      )}
    </div>
  )
})

// Re-export a couple icons for convenience in app code
export const ChainOfThoughtIcons = { Search: SearchIcon }

