import { createPreloader } from '../src/'

const preloader = createPreloader()

const urls = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://images.pexels.com/photos/248797/pexels-photo-248797.jpeg',
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
