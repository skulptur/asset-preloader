import { preloader } from '../src/'

const loader = preloader()

loader
  .fetch([
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  ])
  // use the promise or the onComplete event
  .then((items) => {
    console.log(items)
  })

loader.onComplete((items) => {
  console.log(items)
})

loader.onProgress((event) => {
  console.log(event.progress + '%')
})

loader.onFetched((item) => {
  console.log(item)
})

loader.onError((item) => {
  console.log(item)
})
