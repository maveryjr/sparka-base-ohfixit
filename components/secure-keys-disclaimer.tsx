import { siteConfig } from '@/lib/config';
import { KeyIcon } from 'lucide-react';

export function SecureKeysDisclaimer() {
  return (
    <div className="bg-muted border border-border rounded-lg p-3 sm:p-4">
      <h3 className="font-semibold text-foreground mb-2 flex items-center text-sm sm:text-base">
        <KeyIcon className="w-4 h-4 mr-2" />
        Secure API Key Setup
      </h3>
      <p className="text-xs text-muted-foreground">
        To perform research, you&apos;ll need to provide your API keys. These
        keys are stored securely using HTTP-only cookies and are never exposed
        to client-side JavaScript.
      </p>
      <div className="mt-3 flex flex-col space-y-2 text-xs">
        <div className="text-muted-foreground">
          <p>
            <span className="font-medium">Self-hosting option:</span> You can
            clone the repository and host this application on your own
            infrastructure. This gives you complete control over your data and
            API key management.
          </p>
          <a
            href={siteConfig.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            View self-hosting instructions
            <svg
              className="w-3 h-3 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
