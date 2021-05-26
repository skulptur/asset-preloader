export const getTotalProgress = (items: Array<{ progress: number }>) => {
  const maxProgress = items.length
  const sumProgress = items.reduce((acc, itemState) => {
    return itemState.progress ? acc + itemState.progress : acc
  }, 0)

  const totalProgress = sumProgress / maxProgress

  return totalProgress
}
