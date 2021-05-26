// code adapted from and improved upon https://github.com/andreupifarre/preload-it
import { createPubSub } from 'lightcast'

export const getItemByUrl = (context: PreloaderContext) => (rawUrl: string) => {
  for (var item of context.state) {
    if (item.url == rawUrl) return item
  }
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

export const updateProgress = (context: PreloaderContext) => (item: StateItem) => {
  let sumCompletion = 0
  let maxCompletion = context.state.length
  let initialisedCount = 0

  for (const itemState of context.state) {
    if (itemState.completion) initialisedCount++
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

export const preloadItem = <T>(context: PreloaderContext) => (
  url: string,
  done: (item: T) => void
) => {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'blob'

  const item = getItemByUrl(context)(url)
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

export const fetch = (context: PreloaderContext) => (list: Array<string>) => {
  return new Promise((resolve) => {
    context.loaded = list.length
    for (let item of list) {
      context.state.push({ url: item })
      preloadItem(context)(item, (item) => {
        context.onFetched(item)
        context.loaded--
        if (context.loaded == 0) {
          context.onComplete(context.state)
          resolve(context.state)
        }
      })
    }
  })
}

type StateItem = any

type State = Array<StateItem>

type ProgressPayload = {
  item: StateItem
  progress: number
}

type PreloaderContext = {
  state: State
  loaded: number
  onProgress: (payload: ProgressPayload) => void
  onComplete: (payload: State) => void
  onFetched: (payload: StateItem) => void
  onError: (payload: any) => void
  onCancel: (payload: State) => void
}

export const createPreloader = () => {
  const onProgress = createPubSub<ProgressPayload>()
  const onComplete = createPubSub<State>()
  const onFetched = createPubSub<StateItem>()
  const onError = createPubSub<string>()
  const onCancel = createPubSub<State>()

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
