const KEY = 'studyhub_favorites'

export function getFavorites() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isFavorite(id) {
  return getFavorites().some((f) => f.id === id)
}

export function toggleFavorite(item) {
  const favs = getFavorites()
  const idx = favs.findIndex((f) => f.id === item.id)
  if (idx >= 0) {
    favs.splice(idx, 1)
  } else {
    favs.unshift(item)
  }
  localStorage.setItem(KEY, JSON.stringify(favs.slice(0, 100)))
  return idx < 0
}

export function removeFavorite(id) {
  const favs = getFavorites().filter((f) => f.id !== id)
  localStorage.setItem(KEY, JSON.stringify(favs))
}