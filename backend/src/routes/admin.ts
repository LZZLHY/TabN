import { Router } from 'express'
import { requireAdmin, requireAuth, requireRoot } from '../middleware/auth'
import {
  deleteBookmarkAsAdmin,
  listBookmarks,
  listExtensions,
  listUsers,
  changeRootPassword,
  getProjectSettings,
  putProjectSettings,
  resetUserPassword,
  reviewExtension,
  setUserRole,
  updateRootProfile,
  updateUserProfileAsRoot,
} from '../controllers/adminController'

export const adminRouter = Router()

adminRouter.get('/users', requireAuth, requireAdmin, listUsers)
adminRouter.patch('/users/:id/role', requireAuth, requireRoot, setUserRole)
adminRouter.put('/users/:id/password', requireAuth, requireRoot, resetUserPassword)
adminRouter.put('/users/:id/profile', requireAuth, requireRoot, updateUserProfileAsRoot)

adminRouter.put('/root/profile', requireAuth, requireRoot, updateRootProfile)
adminRouter.put('/root/password', requireAuth, requireRoot, changeRootPassword)

adminRouter.get('/bookmarks', requireAuth, requireAdmin, listBookmarks)
adminRouter.delete('/bookmarks/:id', requireAuth, requireAdmin, deleteBookmarkAsAdmin)

adminRouter.get('/extensions', requireAuth, requireAdmin, listExtensions)
adminRouter.patch('/extensions/:id/review', requireAuth, requireAdmin, reviewExtension)

adminRouter.get('/project-settings', requireAuth, requireRoot, getProjectSettings)
adminRouter.put('/project-settings', requireAuth, requireRoot, putProjectSettings)


