import { ChatProviders } from './chat-providers';
import { auth } from '../(auth)/auth';
import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DefaultModelProvider } from '@/providers/default-model-provider';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/all-models';
import { ANONYMOUS_LIMITS } from '@/lib/types/anonymous';
import { AppSidebar } from '@/components/app-sidebar';
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';
import { SessionProvider } from 'next-auth/react';
import type { ModelId } from '@/lib/ai/model-id';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  const cookieModel = cookieStore.get('chat-model')?.value as ModelId;
  const isAnonymous = !session?.user;

  // Check if the model from cookie is available for anonymous users
  let defaultModel = cookieModel ?? DEFAULT_CHAT_MODEL;

  if (isAnonymous && cookieModel) {
    const isModelAvailable = ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(
      cookieModel as any,
    );
    if (!isModelAvailable) {
      // Switch to default model if current model is not available for anonymous users
      defaultModel = DEFAULT_CHAT_MODEL;
    }
  }

  return (
    <SessionProvider session={session}>
      <ChatProviders user={session?.user}>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar />
          <SidebarInset>
            <DefaultModelProvider defaultModel={defaultModel}>
              <KeyboardShortcuts />

              {children}
            </DefaultModelProvider>
          </SidebarInset>
        </SidebarProvider>
      </ChatProviders>
    </SessionProvider>
  );
}
