import { getItemByUrl } from './getItemByUrl'
import { getTotalProgress } from './getTotalProgress'
import { preloadAsset, Asset, ProgressPayload } from './preloadAsset'
import { createEvents } from './events'

type LoadOptions = {
  onProgress: (payload: ProgressPayload) => void
  responseType: XMLHttpRequestResponseType
}

export const createPreloader = () => {
  const events = createEvents()

  let assets: Array<Asset> = []
  let assetsToLoad: number = 0
  let hasStarted = false
  let pending: Array<() => Asset> = []

  const start = () => {
    pending.forEach((pendingAsset) => {
      assets.push(pendingAsset())
    })
    pending = []
  }

  const cancel = () => {
    assets.forEach((item) => {
      if (item.progress < 1) {
        item.xhr.abort()
        item.status = 0
      }
    })

    events.onCancel.dispatch(assets)
  }

  const dispose = () => {
    cancel()
    assets = []
    Object.values(events).forEach(({ dispose }) => dispose())
  }

  const load = (
    url: string,
    { responseType, onProgress = () => {} }: Partial<LoadOptions> = {}
  ) => {
    return new Promise<Asset>((resolve) => {
      assetsToLoad++

      const loadAsset = () =>
        preloadAsset({
          url,
          responseType,
          onProgress: (payload) => {
            events.onProgress.dispatch({
              ...payload,
              progress: getTotalProgress(assets),
            })

            onProgress(payload)
          },
          onError: events.onError.dispatch,
          onComplete: (asset) => {
            events.onFetched.dispatch(asset)
            assetsToLoad--
            if (assetsToLoad === 0) {
              events.onComplete.dispatch(assets)
              resolve(asset)
              dispose()
            }
          },
        })

      hasStarted ? assets.push(loadAsset()) : pending.push(loadAsset)
    })
  }

  return {
    load,
    start,
    getItemByUrl: getItemByUrl(assets),
    onProgress: events.onProgress.subscribe,
    onComplete: events.onComplete.subscribe,
    onFetched: events.onFetched.subscribe,
    onError: events.onError.subscribe,
    onCancel: events.onCancel.subscribe,
    cancel,
    dispose,
  }
}
