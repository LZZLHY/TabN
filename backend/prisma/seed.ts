import { prisma } from '../src/prisma'
import { SYSTEM_ADMIN_ID } from '../src/constants'
import { hashPassword } from '../src/services/auth'
import { generateUniqueNickname } from '../src/utils/nickname'

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME?.trim() || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || 'admin123456'

  // 固定 ID 的原始系统管理员（用于“数据库重建后”恢复管理员入口）
  const existed = await prisma.user.findUnique({ where: { id: SYSTEM_ADMIN_ID } })
  const nickname = existed?.nickname || (await generateUniqueNickname('管理员'))
  const passwordHash = await hashPassword(adminPassword)

  // 说明：某些 IDE/TS Server 可能会缓存旧的 Prisma 类型定义，导致 role 字段报类型错误；
  // 这里用 any 兜底，运行时仍会按当前 schema 正确写入 ROOT。
  const createData: any = {
    id: SYSTEM_ADMIN_ID,
    username: adminUsername,
    passwordHash,
    email: null,
    phone: null,
    nickname,
    role: 'ROOT',
  }

  const updateData: any = {
    username: adminUsername,
    passwordHash,
    nickname,
    role: 'ROOT',
  }

  await prisma.user.upsert({
    where: { id: SYSTEM_ADMIN_ID },
    create: createData,
    update: updateData,
  })

  // 轻量“旧版本残留”清理：确保不会存在重复的 username 指向其他用户
  // （如果你后续要做更激进的清理策略，我们再按历史版本规则细化）
  await prisma.user.deleteMany({
    where: {
      id: { not: SYSTEM_ADMIN_ID },
      username: adminUsername,
    },
  })

  // eslint-disable-next-line no-console
  console.log('[seed] ROOT 初始管理员已创建/已确保：', SYSTEM_ADMIN_ID)
  // eslint-disable-next-line no-console
  console.log(`[seed] 初始账号：${adminUsername}`)
  // eslint-disable-next-line no-console
  console.log(`[seed] 初始密码：${adminPassword}`)
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


