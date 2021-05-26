// code adapted from and improved upon https://github.com/andreupifarre/preload-it
import { createPubSub, PubSub } from 'lightcast'

// generic utils
export const getItemByUrl = (items: Array<{ url: string }>) => (url: string) => {
  return items.find((item) => item.url === url)
}

export const getTotalProgress = (items: Array<{ progress: number }>) => {
  const maxProgress = items.length
  const sumProgress = items.reduce((acc, itemState) => {
    return itemState.progress ? acc + itemState.progress : acc
  }, 0)

  const totalProgress = sumProgress / maxProgress

  return totalProgress
}

type PreloadItemProps = {
  onProgress: (payload: ProgressPayload) => void
  onError: (asset: Asset) => void
  assets: Array<Asset>
  url: string
  responseType?: XMLHttpRequestResponseType
}

export const preloadItem = ({
  url,
  assets,
  onProgress,
  onError,
  responseType = 'blob',
}: PreloadItemProps) => {
  return new Promise<Asset>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = responseType

    const item = getItemByUrl(assets)(url) as Asset
    item.xhr = xhr

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        item.progress = event.loaded / event.total
        item.downloaded = event.loaded
        item.total = event.total

        onProgress({ progress: getTotalProgress(assets), item })
      }
    }

    xhr.onload = (event) => {
      // TODO: fix
      // @ts-expect-error
      const type = event.target.response.type
      // @ts-expect-error
      const responseURL = event.target.responseURL

      item.fileName = responseURL.substring(responseURL.lastIndexOf('/') + 1)
      item.type = type
      item.status = xhr.status

      if (xhr.status == 404) {
        item.blobUrl = item.size = null
        item.error = true
        onError(item)
      } else {
        // TODO: fix
        // @ts-expect-error
        const blob = new Blob([event.target.response], { type })
        item.blobUrl = URL.createObjectURL(blob)
        item.size = blob.size
        item.error = false
      }
      resolve(item)
    }
    xhr.send()
  })
}

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
  item: Asset
  progress: number
}

type PreloaderEvents = {
  onProgress: PubSub<ProgressPayload>
  onComplete: PubSub<Array<Asset>>
  onFetched: PubSub<Asset>
  onError: PubSub<Asset>
  onCancel: PubSub<Array<Asset>>
}

type PreloaderContext = {
  assets: Array<Asset>
  loaded: number
  events: PreloaderEvents
}

export const createPreloader = () => {
  const events: PreloaderEvents = {
    onProgress: createPubSub(),
    onComplete: createPubSub(),
    onFetched: createPubSub(),
    onError: createPubSub(),
    onCancel: createPubSub(),
  }

  const context: PreloaderContext = {
    assets: [],
    loaded: 0,
    events,
  }

  const fetch = (urls: Array<string>, responseType: XMLHttpRequestResponseType) => {
    return new Promise<Array<Asset>>((resolve) => {
      context.loaded = urls.length
      urls.forEach((url) => {
        // the item isn't a full StateItem yet but for the sake of simplicity we just cast
        context.assets.push({ url } as Asset)
        preloadItem({
          assets: context.assets,
          onProgress: context.events.onProgress.dispatch,
          onError: context.events.onError.dispatch,
          url,
          responseType,
        }).then((loadedItem) => {
          context.events.onFetched.dispatch(loadedItem)
          context.loaded--
          if (context.loaded == 0) {
            context.events.onComplete.dispatch(context.assets)
            resolve(context.assets)
          }
        })
      })
    })
  }

  const cancel = () => {
    context.assets.forEach((item) => {
      if (item.progress < 1) {
        item.xhr.abort()
        item.status = 0
      }
    })

    context.events.onCancel.dispatch(context.assets)
  }

  const dispose = () => {
    cancel()
    Object.values(events).forEach(({ dispose }) => dispose())
  }

  return {
    fetch,
    // preloadItem: preloadItem(),
    getItemByUrl: getItemByUrl(context.assets),
    onProgress: events.onProgress.subscribe,
    onComplete: events.onComplete.subscribe,
    onFetched: events.onFetched.subscribe,
    onError: events.onError.subscribe,
    onCancel: events.onCancel.subscribe,
    cancel,
    dispose,
  }
}
