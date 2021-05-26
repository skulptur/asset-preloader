## `asset-preloader`

A tiny Typescript asset preloader for the browser via XHR2. It can preload assets of different file types and composite progress together and supports multiple event subscriptions.

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

preloader
  .fetch([
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  ])
  .then((state) => {
    // use the promise or the onComplete event
    console.log('resolved', state)
  })

preloader.onComplete((state) => {
  console.log('completed', state)
})

preloader.onProgress((event) => {
  // use Math.round() if you want integers only
  console.log(event.progress + '%')
})

preloader.onFetched((state) => {
  console.log('fetched', state)
})

preloader.onError((state) => {
  console.log('error', state)
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
