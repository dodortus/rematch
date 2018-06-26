import pluginFactory from './pluginFactory'
import dispatchPlugin from './plugins/dispatch'
import effectsPlugin from './plugins/effects'
import createRedux from './redux'
import * as R from './typings'
import validate from './utils/validate'

const corePlugins: R.Plugin[] = [dispatchPlugin, effectsPlugin]

/**
 * Rematch class
 *
 * an instance of Rematch generated by "init"
 */
export default class Rematch {
	protected config: R.Config
	protected models: R.Model[]
	private plugins: R.Plugin[] = []
	private pluginFactory: R.PluginFactory

	constructor(config: R.Config) {
		this.config = config
		this.pluginFactory = pluginFactory(config)
		for (const plugin of corePlugins.concat(this.config.plugins)) {
			this.plugins.push(this.pluginFactory.create(plugin))
		}
		// preStore: middleware, model hooks
		this.forEachPlugin('middleware', (middleware) => {
			this.config.redux.middlewares.push(middleware)
		})
	}
	public forEachPlugin(method: string, fn: (content: any) => void) {
		for (const plugin of this.plugins) {
			if (plugin[method]) {
				fn(plugin[method])
			}
		}
	}
	public getModels(models: R.Models): R.Model[] {
		return Object.keys(models).map((name: string) => ({
			name,
			...models[name],
			reducers: models[name].reducers || {},
		}))
	}
	public addModel(model: R.Model) {
		validate([
			[!model, 'model config is required'],
			[typeof model.name !== 'string', 'model "name" [string] is required'],
			[model.state === undefined && model.baseReducer === undefined, 'model "state" is required'],
			[model.baseReducer !== undefined && typeof model.baseReducer !== 'function', 'model "baseReducer" must be a function'],
		])
		// run plugin model subscriptions
		this.forEachPlugin('onModel', (onModel) => onModel(model))
	}
	public init() {
		// collect all models
		this.models = this.getModels(this.config.models)
		for (const model of this.models) {
			this.addModel(model)
		}
		// create a redux store with initialState
		// merge in additional extra reducers
		const redux = createRedux.call(this, {
			redux: this.config.redux,
			models: this.models,
		})

		const rematchStore = {
			name: this.config.name,
			...redux.store,
			// dynamic loading of models with `replaceReducer`
			model: (model: R.Model) => {
				this.addModel(model)
				redux.mergeReducers(redux.createModelReducer(model))
				redux.store.replaceReducer(redux.createRootReducer(this.config.redux.rootReducers))
				redux.store.dispatch({ type: '@@redux/REPLACE '})
			},
		}

		this.forEachPlugin('onStoreCreated', (onStoreCreated) => {
			const returned = onStoreCreated(rematchStore)
			// if onStoreCreated returns an object value
			// merge its returned value onto the store
			if (returned) {
				Object.keys(returned || {}).forEach((key) => {
					rematchStore[key] = returned[key]
				})
			}
		})

		return rematchStore
	}
}
