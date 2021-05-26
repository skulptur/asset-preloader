import { createPreloader } from '../src/'

const preloader = createPreloader()

preloader
  .fetch([
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  ])
  .then((assets) => {
    // use the promise or the onComplete event
    console.log('resolved', assets)
  })

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
