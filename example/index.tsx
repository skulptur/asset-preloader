import { createPreloader } from '../src/'

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
  console.log(Math.round(event.progress * 100) + '%')
})

preloader.onFetched((state) => {
  console.log('fetched', state)
})

preloader.onError((state) => {
  console.log('error', state)
})
