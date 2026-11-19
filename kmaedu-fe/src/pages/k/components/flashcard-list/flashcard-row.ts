/** One flashcard set as the list shows it. */
export interface FlashcardRow {
  id: string
  name: string
  cardCount: number
  viewCount: number
  createdAt?: string
  description: string
  isPublic: boolean
  isPinned: boolean
  createdDate: string
  tags: string[]
}

export interface FlashcardRowHandlers {
  onPlay: (id: string) => void
  onManage: (id: string) => void
  onEdit: (id: string) => void
  onShare: (id: string) => void
  onDelete: (id: string) => void
}
