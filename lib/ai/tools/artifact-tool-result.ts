import type { ArtifactKind } from '@/lib/artifacts/artifact-kind';

export interface ArtifactToolResult {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
}
