import {
	Config,
	ModelEffects,
	ModelReducers,
	NamedModel,
	Plugin,
	Models,
} from './types'

/**
 * If the first item is true, it means there is an error described by
 * the second item.
 */
export type Validation = [boolean | undefined, string]

/**
 * Checks if a parameter is a valid object.
 */
export const isObject = <T>(obj: T): boolean =>
	typeof obj === 'object' && obj !== null && !Array.isArray(obj)

/**
 * Checks if a parameter is a valid function but only when it's defined.
 * Otherwise, always returns true.
 */
export const ifDefinedIsFunction = <T>(func: T): boolean =>
	!func || typeof func === 'function'

/**
 * Takes an array of arrays of validations. Collects all errors and throws.
 * Should be used by plugins to keep the validation behaviour the same for all
 * Rematch-related libraries.
 */
const validate = (runValidations: () => Validation[]): void => {
	if (process.env.NODE_ENV !== 'production') {
		const validations = runValidations()
		const errors: string[] = []

		for (const validation of validations) {
			const isInvalid = validation[0]
			const errorMessage = validation[1]
			if (isInvalid) {
				errors.push(errorMessage)
			}
		}

		if (errors.length > 0) {
			throw new Error(errors.join(', '))
		}
	}
}

export const validateConfig = (config: Config<any>): void => {
	validate(() => [
		[!Array.isArray(config.plugins), 'init config.plugins must be an array'],
		[
			!isObject<Config<any>>(config.models),
			'init config.models must be an object',
		],
		[
			!isObject<ModelReducers<any>>(config.redux.reducers),
			'init config.redux.reducers must be an object',
		],
		[
			!Array.isArray(config.redux.middlewares),
			'init config.redux.middlewares must be an array',
		],
		[
			!Array.isArray(config.redux.enhancers),
			'init config.redux.enhancers must be an array of functions',
		],
		[
			!ifDefinedIsFunction(config.redux.combineReducers),
			'init config.redux.combineReducers must be a function',
		],
		[
			!ifDefinedIsFunction(config.redux.createStore),
			'init config.redux.createStore must be a function',
		],
	])
}

export const validateModel = (model: NamedModel): void => {
	validate(() => [
		[!model, 'model config is required'],
		[typeof model.name !== 'string', 'model "name" [string] is required'],
		[
			model.state === undefined && model.baseReducer === undefined,
			'model "state" is required',
		],
		[
			!ifDefinedIsFunction(model.baseReducer),
			'model "baseReducer" must be a function',
		],
	])
}

export const validatePlugin = <
	TModels extends Models<TModels>,
	TExposedModels extends Models<TModels>
>(
	plugin: Plugin<TModels, TExposedModels>
): void => {
	validate(() => [
		[
			!ifDefinedIsFunction(plugin.onStoreCreated),
			'Plugin onStoreCreated must be a function',
		],
		[!ifDefinedIsFunction(plugin.onModel), 'Plugin onModel must be a function'],
		[
			!ifDefinedIsFunction(plugin.onReducer),
			'Plugin onReducer must be a function',
		],
		[
			!ifDefinedIsFunction(plugin.onRootReducer),
			'Plugin onRootReducer must be a function',
		],
		[
			!ifDefinedIsFunction(plugin.createMiddleware),
			'Plugin createMiddleware must be a function',
		],
	])
}

export const validateModelReducer = (
	modelName: string,
	reducers: ModelReducers,
	reducerName: string
): void => {
	validate(() => [
		[
			!!reducerName.match(/\/.+\//),
			`Invalid reducer name (${modelName}/${reducerName})`,
		],
		[
			typeof reducers[reducerName] !== 'function',
			`Invalid reducer (${modelName}/${reducerName}). Must be a function`,
		],
	])
}

export const validateModelEffect = <TModels extends Models<TModels>>(
	modelName: string,
	effects: ModelEffects<TModels>,
	effectName: string
): void => {
	validate(() => [
		[
			!!effectName.match(/\//),
			`Invalid effect name (${modelName}/${effectName})`,
		],
		[
			typeof effects[effectName] !== 'function',
			`Invalid effect (${modelName}/${effectName}). Must be a function`,
		],
	])
}

export default validate
