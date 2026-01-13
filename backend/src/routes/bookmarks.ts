import { Router } from 'express'
import {
  createBookmark,
  deleteBookmark,
  listBookmarks,
  updateBookmark,
} from '../controllers/bookmarkController'
import { requireAuth } from '../middleware/auth'

export const bookmarksRouter = Router()

bookmarksRouter.get('/', requireAuth, listBookmarks)
bookmarksRouter.post('/', requireAuth, createBookmark)
bookmarksRouter.patch('/:id', requireAuth, updateBookmark)
bookmarksRouter.delete('/:id', requireAuth, deleteBookmark)


