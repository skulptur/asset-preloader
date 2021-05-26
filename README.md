## `asset-preloader`

A tiny asset preloader for the browser via XHR2. It can preload assets of different file types and composite progress together, with support for multiple event subscriptions.

## Get started

Install

```bash
yarn add asset-preloader
# or
npm install --save asset-preloader
```

Use

```typescript
import { createPreloader } from 'asset-preloader'

const preloader = createPreloader()

const urls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
]

urls.forEach((url) => preloader.load(url))

preloader.start()

// event subscriptions
preloader.onComplete((assets) => {
  console.log('completed', assets)
})

preloader.onProgress((event) => {
  console.log(Math.round(event.progress * 100) + '%')
})

preloader.onFetched((assets) => {
  console.log('fetched', assets)
})

preloader.onError((assets) => {
  console.log('error', assets)
})
```

[Examples](https://github.com/skulptur/asset-preloader/tree/master/example)

## Canceling

The asset preloader can be canceled at any time during loading. When calling `preload.cancel()` all assets already preloaded will be available for use, but the download of pending assets will be abandoned and `status` will be set to `0`.

```typescript
preload.onCancel((items) => {
  console.log(items)
})

preload.cancel()
```
