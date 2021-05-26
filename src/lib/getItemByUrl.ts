export const getItemByUrl = (items: Array<{ url: string }>) => (url: string) => {
  return items.find((item) => item.url === url)
}
