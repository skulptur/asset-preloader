import { Asset } from './asset'
import { getItemByUrl } from './getItemByUrl'
import { getTotalProgress } from './getTotalProgress'
import { preloadAsset } from './preloadAsset'
import { createEvents } from './events'

export const createPreloader = () => {
  const events = createEvents()

  const assets: Array<Asset> = []
  let assetsToLoad: number = 0

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
    Object.values(events).forEach(({ dispose }) => dispose())
  }

  const fetch = (urls: Array<string>, responseType?: XMLHttpRequestResponseType) => {
    return new Promise<Array<Asset>>((resolve) => {
      assetsToLoad += urls.length
      urls.forEach((url) => {
        assets.push(
          preloadAsset({
            url,
            responseType,
            onProgress: (payload) => {
              events.onProgress.dispatch({
                ...payload,
                progress: getTotalProgress(assets),
              })
            },
            onError: events.onError.dispatch,
            onComplete: (loadedItem) => {
              events.onFetched.dispatch(loadedItem)
              assetsToLoad--
              if (assetsToLoad === 0) {
                events.onComplete.dispatch(assets)
                resolve(assets)
                dispose()
              }
            },
          })
        )
      })
    })
  }

  return {
    fetch,
    // preloadItem: preloadItem(),
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
