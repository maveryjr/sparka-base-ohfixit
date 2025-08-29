import type { ModelData } from '@/providers/models-generated';
import { modelsData } from '@/providers/models-generated';
import {
  imageModelsFeatures,
  modelFeatures,
  type ModelFeatures,
} from './model-features';
import type { ImageModelId, ModelId } from './model-id';
import { imageModelsData, type ImageModelData } from '@/providers/image-models';

const disabledModels: Partial<Record<ModelId, true>> = {
  'anthropic/claude-opus-4': true,
  'anthropic/claude-opus-4.1': true,
  'morph/morph-v3-large': true,
  'morph/morph-v3-fast': true,
};

export type ModelDefinition = ModelData & {
  features?: ModelFeatures;
  disabled?: true;
};

export type ImageModelDefinition = ImageModelData & {
  features?: ModelFeatures;
};

export const allModels = modelsData
  .map((model) => {
    const features = modelFeatures[model.id];
    const disabled = disabledModels[model.id];
    return {
      ...model,
      features,
      disabled,
    };
  })
  .filter((model) => !model.disabled && model.type === 'language');

const allImageModels = imageModelsData.map((model) => {
  const features = imageModelsFeatures[model.id];
  return {
    ...model,
    features,
  };
});

const PROVIDER_ORDER = ['openai', 'google', 'anthropic', 'xai'];

export const chatModels = allModels
  .filter(
    (model) =>
      !model.disabled &&
      (model.features?.output?.text === true || !model.features), // Let's show models even if we haven't created features yet
  )
  .sort((a, b) => {
    const aProviderIndex = PROVIDER_ORDER.indexOf(a.owned_by);
    const bProviderIndex = PROVIDER_ORDER.indexOf(b.owned_by);

    // If provider is not in the preferred list, put it at the end
    const aIndex =
      aProviderIndex === -1 ? PROVIDER_ORDER.length : aProviderIndex;
    const bIndex =
      bProviderIndex === -1 ? PROVIDER_ORDER.length : bProviderIndex;

    // Sort by provider order first
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    // Within same provider, maintain original order from allModels array
    return 0;
  });

// Memoized dictionary of models by ID for efficient lookups
const _modelsByIdCache = new Map<string, ModelDefinition>();

function getModelsByIdDict(): Map<string, ModelDefinition> {
  if (_modelsByIdCache.size === 0) {
    allModels.forEach((model) => {
      _modelsByIdCache.set(model.id, model);
    });
  }
  return _modelsByIdCache;
}

export function getModelDefinition(modelId: ModelId): ModelDefinition {
  const modelsByIdDict = getModelsByIdDict();
  const model = modelsByIdDict.get(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

const _imageModelsByIdCache = new Map<string, ImageModelDefinition>();

function getImageModelsByIdDict(): Map<string, ImageModelDefinition> {
  if (_imageModelsByIdCache.size === 0) {
    allImageModels.forEach((model) => {
      _imageModelsByIdCache.set(model.id, model);
    });
  }
  return _imageModelsByIdCache;
}

export function getImageModelDefinition(
  modelId: ImageModelId,
): ImageModelDefinition {
  const modelsByIdDict = getImageModelsByIdDict();
  const model = modelsByIdDict.get(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

export const DEFAULT_CHAT_MODEL: ModelId = 'openai/gpt-5-mini';
export const DEFAULT_PDF_MODEL: ModelId = 'openai/gpt-5-mini';
export const DEFAULT_TITLE_MODEL: ModelId = 'openai/gpt-5-nano';
export const DEFAULT_ARTIFACT_MODEL: ModelId = 'openai/gpt-5-nano';
export const DEFAULT_ARTIFACT_SUGGESTION_MODEL: ModelId = 'openai/gpt-5-mini';
export const DEFAULT_IMAGE_MODEL: ImageModelId = 'openai/gpt-image-1';
export const DEFAULT_CHAT_IMAGE_COMPATIBLE_MODEL: ModelId =
  'openai/gpt-4o-mini';
export const DEFAULT_SUGGESTIONS_MODEL: ModelId = 'openai/gpt-5-mini';
export const DEFAULT_POLISH_TEXT_MODEL: ModelId = 'openai/gpt-5-mini';
export const DEFAULT_FORMAT_AND_CLEAN_SHEET_MODEL: ModelId =
  'openai/gpt-5-mini';
export const DEFAULT_ANALYZE_AND_VISUALIZE_SHEET_MODEL: ModelId =
  'openai/gpt-5-mini';

export const DEFAULT_CODE_EDITS_MODEL: ModelId = 'openai/gpt-5-mini';
