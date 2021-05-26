// code adapted from and improved upon https://github.com/andreupifarre/preload-it
import { createPubSub, PubSub } from 'lightcast'
import { getItemByUrl } from './getItemByUrl'
import { getTotalProgress } from './getTotalProgress'
import { preloadAsset } from './preloadAsset'

export type Asset = {
  xhr: XMLHttpRequest
  blobUrl: string | null
  progress: number
  downloaded: number
  error: boolean
  fileName: string
  size: number | null
  status: number
  total: number
  type: string
  url: string
}

export type ProgressPayload = {
  asset: Asset
  progress: number
}

type PreloaderEvents = {
  onProgress: PubSub<ProgressPayload>
  onComplete: PubSub<Array<Asset>>
  onFetched: PubSub<Asset>
  onError: PubSub<Asset>
  onCancel: PubSub<Array<Asset>>
}

export const createPreloader = () => {
  const events: PreloaderEvents = {
    onProgress: createPubSub(),
    onComplete: createPubSub(),
    onFetched: createPubSub(),
    onError: createPubSub(),
    onCancel: createPubSub(),
  }

  const assets: Array<Asset> = []
  let assetsLoaded: number = 0

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
      assetsLoaded = urls.length
      urls.forEach((url) => {
        const asset = { url } as Asset
        // the item isn't a full StateItem yet but for the sake of simplicity we just cast
        assets.push(asset)
        preloadAsset({
          asset,
          responseType,
          onProgress: () => {
            const totalProgress = getTotalProgress(assets)
            events.onProgress.dispatch({
              asset,
              progress: totalProgress,
            })
          },
          onError: events.onError.dispatch,
          onComplete: (loadedItem) => {
            events.onFetched.dispatch(loadedItem)
            assetsLoaded--
            if (assetsLoaded === 0) {
              events.onComplete.dispatch(assets)
              resolve(assets)
              dispose()
            }
          },
        })
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
