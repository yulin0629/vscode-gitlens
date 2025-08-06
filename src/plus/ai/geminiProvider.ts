import type { CancellationToken } from 'vscode';
import type { Response } from '@env/fetch';
import { fetch } from '@env/fetch';
import { geminiProviderDescriptor as provider } from '../../constants.ai';
import { configuration } from '../../system/-webview/configuration';
import type { AIActionType, AIModel } from './models/model';
import { OpenAICompatibleProviderBase } from './openAICompatibleProviderBase';

type GeminiModel = AIModel<typeof provider.id>;
const models: GeminiModel[] = [
	{
		id: 'gemini-2.5-pro',
		name: 'Gemini 2.5 Pro',
		maxTokens: { input: 1048576, output: 65536 },
		provider: provider,
	},
	{
		id: 'gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		maxTokens: { input: 1048576, output: 65536 },
		provider: provider,
		default: true,
	},
	{
		id: 'gemini-2.5-flash-lite',
		name: 'Gemini 2.5 Flash-Lite',
		maxTokens: { input: 1048576, output: 65536 },
		provider: provider,
	},
];

export class GeminiProvider extends OpenAICompatibleProviderBase<typeof provider.id> {
	readonly id = provider.id;
	readonly name = provider.name;
	protected readonly descriptor = provider;
	protected readonly config = {
		keyUrl: 'https://aistudio.google.com/app/apikey',
	};

	private cachedModels: GeminiModel[] | undefined;
	private cacheExpiry: number = 0;

	async getModels(): Promise<readonly AIModel<typeof provider.id>[]> {
		// Check cache first (15 minutes expiry)
		const now = Date.now();
		if (this.cachedModels && this.cacheExpiry > now) {
			return this.cachedModels;
		}

		try {
			// Try to fetch models from API
			const apiKey = await this.getApiKey(true);
			if (apiKey) {
				const fetchedModels = await this.fetchModelsFromAPI(apiKey);
				if (fetchedModels.length > 0) {
					this.cachedModels = fetchedModels;
					this.cacheExpiry = now + (15 * 60 * 1000); // Cache for 15 minutes
					return fetchedModels;
				}
			}
		} catch {
			// Fall back to hardcoded models if API fetch fails
		}

		// Return hardcoded models as fallback
		return models;
	}

	private async fetchModelsFromAPI(apiKey: string): Promise<GeminiModel[]> {
		try {
			const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				method: 'GET',
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch models: ${response.status}`);
			}

			interface GeminiAPIModel {
				name: string;
				displayName: string;
				inputTokenLimit: number;
				outputTokenLimit: number;
				supportedGenerationMethods?: string[];
			}

			interface GeminiAPIResponse {
				models: GeminiAPIModel[];
			}

			const data = (await response.json()) as GeminiAPIResponse;

			// Filter for Gemini 2.5+ models that support generateContent
			// Exclude TTS models
			const allModels = data.models
				.filter(m =>
					m.name.startsWith('models/gemini-') &&
					m.supportedGenerationMethods?.includes('generateContent') &&
					(m.name.includes('2.5') || m.name.includes('3.') || m.name.includes('4.') || m.name.includes('5.')) &&
					!m.name.toLowerCase().includes('tts') // Exclude TTS models
				)
				.map<GeminiModel>(m => ({
					id: m.name.replace('models/', ''),
					name: m.displayName || m.name.replace('models/', ''),
					maxTokens: {
						input: m.inputTokenLimit || 1048576,
						output: m.outputTokenLimit || 65536
					},
					provider: provider,
					// Set default for gemini-2.5-flash
					default: m.name === 'models/gemini-2.5-flash',
				}));
			
			// Group models by base name to filter out previews when stable exists
			const modelGroups = new Map<string, GeminiModel[]>();
			for (const model of allModels) {
				// Extract base model name (e.g., "gemini-2.5-pro" from "gemini-2.5-pro-preview-03-25")
				let baseName = model.id;
				
				// Remove preview and date suffixes
				baseName = baseName
					.replace(/-preview.*$/, '')
					.replace(/-\d{2}-\d{2}$/, '')
					.replace(/-lite$/, '-lite'); // Keep -lite suffix
				
				if (!modelGroups.has(baseName)) {
					modelGroups.set(baseName, []);
				}
				modelGroups.get(baseName)!.push(model);
			}
			
			// Select the best model from each group
			const geminiModels: GeminiModel[] = [];
			for (const [baseName, models] of modelGroups) {
				// Sort: stable versions first, then by name
				models.sort((a, b) => {
					const aIsStable = !a.id.includes('preview');
					const bIsStable = !b.id.includes('preview');
					if (aIsStable !== bIsStable) {
						return aIsStable ? -1 : 1; // Stable first
					}
					return a.id.localeCompare(b.id);
				});
				
				// Add only the first (best) model from each group
				geminiModels.push(models[0]);
			}

			return geminiModels.length > 0 ? geminiModels : models;
		} catch (error) {
			// Return empty array on error to fall back to hardcoded models
			return [];
		}
	}

	protected getUrl(_model: AIModel<typeof provider.id>): string {
		return `https://generativelanguage.googleapis.com/v1beta/chat/completions`;
	}

	protected override fetchCore(
		action: AIActionType,
		model: AIModel<typeof provider.id>,
		apiKey: string,
		request: object,
		cancellation: CancellationToken | undefined,
	): Promise<Response> {
		if ('max_completion_tokens' in request) {
			const { max_completion_tokens: max, ...rest } = request;
			request = max ? { max_tokens: max, ...rest } : rest;
		}
		return super.fetchCore(action, model, apiKey, request, cancellation);
	}
}
