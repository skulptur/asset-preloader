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
  event: ProgressEvent<EventTarget>
}

type PreloadAssetProps = {
  url: string
  onProgress: (payload: ProgressPayload) => void
  onError: (asset: Asset) => void
  onComplete: (asset: Asset) => void
  responseType?: XMLHttpRequestResponseType
}

export const preloadAsset = ({
  url,
  onProgress,
  onComplete,
  onError,
  responseType = 'blob',
}: PreloadAssetProps) => {
  const asset = { url } as Asset

  const request = () => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', asset.url, true)
    xhr.responseType = responseType

    asset.xhr = xhr

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        asset.progress = event.loaded / event.total
        asset.downloaded = event.loaded
        asset.total = event.total
        onProgress({
          progress: asset.progress,
          event,
          asset,
        })
      }
    }

    xhr.onload = (event) => {
      // TODO: fix
      // @ts-expect-error
      const type = event.target.response.type
      // @ts-expect-error
      const responseURL = event.target.responseURL

      asset.fileName = responseURL.substring(responseURL.lastIndexOf('/') + 1)
      asset.type = type
      asset.status = xhr.status

      if (xhr.status == 404) {
        asset.blobUrl = asset.size = null
        asset.error = true
        onError(asset)
      } else {
        // TODO: fix
        // @ts-expect-error
        const blob = new Blob([event.target.response], { type })
        asset.blobUrl = URL.createObjectURL(blob)
        asset.size = blob.size
        asset.error = false
      }
      onComplete(asset)
    }
    xhr.send()
  }

  request()

  return asset
}
