import { createPubSub, PubSub } from 'lightcast'
import { ProgressPayload, Asset } from './preloadAsset'

export type PreloaderEvents = {
  onProgress: PubSub<ProgressPayload>
  onComplete: PubSub<Array<Asset>>
  onFetched: PubSub<Asset>
  onError: PubSub<Asset>
  onCancel: PubSub<Array<Asset>>
}

export const createEvents = (): PreloaderEvents => {
  return {
    onProgress: createPubSub(),
    onComplete: createPubSub(),
    onFetched: createPubSub(),
    onError: createPubSub(),
    onCancel: createPubSub(),
  }
}
