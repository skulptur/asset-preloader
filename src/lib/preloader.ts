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

export const preloadItem = (context: PreloaderContext) => (
  url: string,
  responseType: XMLHttpRequestResponseType = 'blob'
) => {
  return new Promise<Asset>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = responseType

    const item = getItemByUrl(context.state)(url) as Asset
    item.xhr = xhr

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        item.progress = event.loaded / event.total
        item.downloaded = event.loaded
        item.total = event.total
        const totalProgress = getTotalProgress(context.state)

        context.events.onProgress.dispatch({
          progress: totalProgress,
          item: item,
        })
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
        context.events.onError.dispatch(item)
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

export const fetch = (context: PreloaderContext) => (
  urls: Array<string>,
  responseType?: XMLHttpRequestResponseType
) => {
  return new Promise<Array<Asset>>((resolve) => {
    context.loaded = urls.length
    for (let itemUrl of urls) {
      // the item isn't a full StateItem yet but for the sake of simplicity we just cast
      context.state.push({ url: itemUrl } as Asset)
      preloadItem(context)(itemUrl, responseType).then((loadedItem) => {
        context.events.onFetched.dispatch(loadedItem)
        context.loaded--
        if (context.loaded == 0) {
          context.events.onComplete.dispatch(context.state)
          resolve(context.state)
        }
      })
    }
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
  onError: PubSub<any>
  onCancel: PubSub<Array<Asset>>
}

type PreloaderContext = {
  state: Array<Asset>
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
    state: [],
    loaded: 0,
    events,
  }

  const cancel = () => {
    context.state.forEach((item) => {
      if (item.progress < 1) {
        item.xhr.abort()
        item.status = 0
      }
    })

    context.events.onCancel.dispatch(context.state)
  }

  const dispose = () => {
    cancel()
    Object.values(events).forEach(({ dispose }) => dispose())
  }

  return {
    fetch: fetch(context),
    preloadItem: preloadItem(context),
    getItemByUrl: getItemByUrl(context.state),
    onProgress: events.onProgress.subscribe,
    onComplete: events.onComplete.subscribe,
    onFetched: events.onFetched.subscribe,
    onError: events.onError.subscribe,
    onCancel: events.onCancel.subscribe,
    cancel,
    dispose,
  }
}
