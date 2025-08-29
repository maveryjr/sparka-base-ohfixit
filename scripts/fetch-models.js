#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

async function fetchAndConvertModels() {
  try {
    console.log('Fetching models from API...');

    // Fetch the JSON data from the API
    const response = await fetch('https://ai-gateway.vercel.sh/v1/models');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();

    // Write the JSON file
    const jsonPath = path.join(__dirname, '../providers/models.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log('Saved JSON file:', jsonPath);

    // Filter out embedding models
    const nonEmbeddingData = jsonData.data.filter(
      (model) => model.type !== 'embedding',
    );

    // Extract unique providers from owned_by property for non-embedding models
    const providers = [
      ...new Set(nonEmbeddingData.map((model) => model.owned_by)),
    ].sort();

    // Extract all model ids from non-embedding models
    const models = [
      ...new Set(nonEmbeddingData.map((model) => model.id)),
    ].sort();

    // Generate TypeScript content
    const outputPath = path.join(__dirname, '../providers/models-generated.ts');
    const tsContent = `// List of unique providers extracted from models data
export const providers = ${JSON.stringify(providers, null, 2)} as const;

export type ProviderId = (typeof providers)[number];

// List of all model ids extracted from models data
export const models = ${JSON.stringify(models, null, 2)} as const;

export type ModelId = (typeof models)[number];

export interface ModelData {
  id: ModelId;
  object: string;
  owned_by: ProviderId;
  name: string;
  description: string;
  type: 'language' | 'embedding';
  context_window: number; // Max input tokens
  max_tokens: number; // Max output tokens
  pricing: {
    input: string; // Input price per token
    output: string; // Output price per token
    input_cache_read?: string; // Input cache read price per token
    input_cache_write?: string; // Input cache write price per token
  };
}

// Define the data with proper typing
export const modelsData: ModelData[] = ${JSON.stringify(
      nonEmbeddingData.map(({ created, ...model }) => model),
      null,
      2,
    )};
`;

    // Write the TypeScript file
    fs.writeFileSync(outputPath, tsContent);
    console.log('Generated TypeScript file:', outputPath);

    // Format the generated TypeScript file with biome
    try {
      console.log('Formatting TypeScript file with biome...');
      execSync(`npx biome format --write "${outputPath}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      console.log('Successfully formatted TypeScript file');
    } catch (formatError) {
      console.warn(
        'Warning: Failed to format with biome:',
        formatError.message,
      );
    }

    // Also write the providers list to a separate JSON file
    const providersJsonPath = path.join(
      __dirname,
      '../providers/providers-list.json',
    );
    fs.writeFileSync(providersJsonPath, JSON.stringify(providers, null, 2));
    console.log('Generated providers list:', providersJsonPath);
  } catch (error) {
    console.error('Error fetching or converting models:', error);
    process.exit(1);
  }
}

fetchAndConvertModels();
