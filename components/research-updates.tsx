import React from 'react';
import { WebToolAction } from './tool-actions';
import type { WebSearchUpdate } from '@/lib/ai/tools/research-updates-schema';

// TODO: Make sure these components are used or remove them

// Web updates component
const WebUpdates: React.FC<{ updates: WebSearchUpdate[] }> = ({ updates }) => {
  return (
    <>
      {updates.map((update, updateIndex) => (
        <div key={`web-update-${updateIndex}`} className="space-y-2">
          {update.results?.map((result, resultIndex) => (
            <WebToolAction
              key={`web-${updateIndex}-${resultIndex}`}
              result={result}
            />
          ))}
        </div>
      ))}
    </>
  );
};
