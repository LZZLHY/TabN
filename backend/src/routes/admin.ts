import { Router } from 'express'
import { requireAdmin, requireAuth, requireRoot } from '../middleware/auth'
import {
  deleteBookmarkAsAdmin,
  updateBookmarkAsAdmin,
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
  getServerStatus,
  getAdminBookmarkStats,
  getAdminHeatRanking,
  getTagStats,
  updateBookmarkTagsAsAdmin,
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
adminRouter.patch('/bookmarks/:id', requireAuth, requireAdmin, updateBookmarkAsAdmin)
adminRouter.patch('/bookmarks/:id/tags', requireAuth, requireAdmin, updateBookmarkTagsAsAdmin)
adminRouter.get('/bookmarks/stats', requireAuth, requireAdmin, getAdminBookmarkStats)
adminRouter.get('/bookmarks/heat-ranking', requireAuth, requireAdmin, getAdminHeatRanking)

// 标签管理
adminRouter.get('/tags', requireAuth, requireAdmin, getTagStats)

adminRouter.get('/extensions', requireAuth, requireAdmin, listExtensions)
adminRouter.patch('/extensions/:id/review', requireAuth, requireAdmin, reviewExtension)

adminRouter.get('/project-settings', requireAuth, requireRoot, getProjectSettings)
adminRouter.put('/project-settings', requireAuth, requireRoot, putProjectSettings)

// 服务器状态
adminRouter.get('/server-status', requireAuth, requireAdmin, getServerStatus)


