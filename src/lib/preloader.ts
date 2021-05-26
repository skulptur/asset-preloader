// code adapted from and improved upon https://github.com/andreupifarre/preload-it
import { createPubSub } from 'lightcast'

export const getItemByUrl = (context: PreloaderContext) => (url: string) => {
  for (var item of context.state) {
    if (item.url == url) return item
  }

  return null
}

export const cancel = (context: PreloaderContext) => () => {
  for (var item of context.state) {
    if (item.completion < 1) {
      item.xhr.abort()
      item.status = 0
    }
  }

  context.onCancel(context.state)

  return context.state
}

export const updateProgress = (context: PreloaderContext) => (item: Asset) => {
  let sumCompletion = 0
  let maxCompletion = context.state.length

  for (const itemState of context.state) {
    if (itemState.completion) {
      sumCompletion += itemState.completion
    }
  }

  const totalCompletion = sumCompletion / maxCompletion

  if (!isNaN(totalCompletion)) {
    context.onProgress({
      progress: totalCompletion,
      item: item,
    })
  }
}

export const preloadItem = (context: PreloaderContext) => (
  url: string,
  done: (item: Asset) => void
) => {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'blob'

  const item = getItemByUrl(context)(url) as Asset
  item.xhr = xhr

  xhr.onprogress = (event) => {
    if (event.lengthComputable) {
      item.completion = event.loaded / event.total
      item.downloaded = event.loaded
      item.total = event.total
      updateProgress(context)(item)
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
      context.onError(item)
    } else {
      // TODO: fix
      // @ts-expect-error
      const blob = new Blob([event.target.response], { type })
      item.blobUrl = URL.createObjectURL(blob)
      item.size = blob.size
      item.error = false
    }
    done(item)
  }
  xhr.send()
}

export const fetch = (context: PreloaderContext) => (urls: Array<string>) => {
  return new Promise<Assets>((resolve) => {
    context.loaded = urls.length
    for (let itemUrl of urls) {
      // the item isn't a full StateItem yet but for the sake of simplicity we just cast
      context.state.push({ url: itemUrl } as Asset)
      preloadItem(context)(itemUrl, (loadedItem) => {
        context.onFetched(loadedItem)
        context.loaded--
        if (context.loaded == 0) {
          context.onComplete(context.state)
          resolve(context.state)
        }
      })
    }
  })
}

type Asset = {
  xhr: XMLHttpRequest
  blobUrl: string | null
  completion: number
  downloaded: number
  error: boolean
  fileName: string
  size: number | null
  status: number
  total: number
  type: string
  url: string
}

type Assets = Array<Asset>

type ProgressPayload = {
  item: Asset
  progress: number
}

type PreloaderContext = {
  state: Assets
  loaded: number
  onProgress: (payload: ProgressPayload) => void
  onComplete: (payload: Assets) => void
  onFetched: (payload: Asset) => void
  onError: (payload: any) => void
  onCancel: (payload: Assets) => void
}

export const createPreloader = () => {
  const onProgress = createPubSub<ProgressPayload>()
  const onComplete = createPubSub<Assets>()
  const onFetched = createPubSub<Asset>()
  const onError = createPubSub<string>()
  const onCancel = createPubSub<Assets>()

  const context: PreloaderContext = {
    state: [],
    loaded: 0,
    onProgress: onProgress.dispatch,
    onComplete: onComplete.dispatch,
    onFetched: onFetched.dispatch,
    onError: onError.dispatch,
    onCancel: onCancel.dispatch,
  }

  const dispose = () => {
    cancel(context)()

    onProgress.dispose()
    onComplete.dispose()
    onFetched.dispose()
    onError.dispose()
    onCancel.dispose()
  }

  return {
    fetch: fetch(context),
    updateProgress: updateProgress(context),
    preloadItem: preloadItem(context),
    getItemByUrl: getItemByUrl(context),
    cancel: cancel(context),
    onProgress: onProgress.subscribe,
    onComplete: onComplete.subscribe,
    onFetched: onFetched.subscribe,
    onError: onError.subscribe,
    onCancel: onCancel.subscribe,
    dispose,
  }
}
