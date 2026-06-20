import bcrypt from 'bcryptjs'
import { ADMIN_CONFIG_DEFAULTS as D } from '@coffee/shared'
import prisma from './prisma.js'

const SINGLETON_ID = 'singleton'

// Hashes ADMIN_PASSWORD from the environment and writes it to AdminConfig on first startup.
// If the row already exists, this is a no-op — the env var is ignored after initial seeding.
// Throws if ADMIN_PASSWORD is unset and no row exists yet.
export async function ensureAdminPassword(): Promise<void> {
  const existing = await prisma.adminConfig.findUnique({ where: { id: SINGLETON_ID } })
  if (existing) return

  const initial = process.env.ADMIN_PASSWORD
  if (!initial) throw new Error('ADMIN_PASSWORD env var is required for initial admin setup')

  const passwordHash = await bcrypt.hash(initial, 10)
  await prisma.adminConfig.create({ data: { id: SINGLETON_ID, passwordHash } })
  console.log('Admin password seeded from ADMIN_PASSWORD env var')
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const config = await prisma.adminConfig.findUnique({ where: { id: SINGLETON_ID } })
  if (!config) return false
  return bcrypt.compare(password, config.passwordHash)
}

export async function updateAdminPassword(newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { passwordHash } })
}

export async function getLanguage(): Promise<string> {
  const config = await prisma.adminConfig.findUnique({ where: { id: SINGLETON_ID } })
  return config?.language ?? D.language
}

export async function setLanguage(language: string): Promise<void> {
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { language } })
}

export async function getPickupLanguage(): Promise<string> {
  const config = await prisma.adminConfig.findUnique({ where: { id: SINGLETON_ID } })
  return config?.pickupLanguage ?? D.pickupLanguage
}

export async function setPickupLanguage(pickupLanguage: string): Promise<void> {
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { pickupLanguage } })
}

export async function getDarkMode(): Promise<boolean> {
  const config = await prisma.adminConfig.findUnique({ where: { id: SINGLETON_ID } })
  return config?.darkMode ?? D.darkMode
}

export async function setDarkMode(darkMode: boolean): Promise<void> {
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { darkMode } })
}

export async function getQrBaseUrl(): Promise<string> {
  const config = await prisma.adminConfig.findUnique({ where: { id: SINGLETON_ID } })
  return config?.qrBaseUrl ?? ''
}

export async function setQrBaseUrl(qrBaseUrl: string): Promise<void> {
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { qrBaseUrl } })
}

export async function getMenuDisplay(): Promise<{
  showDescription: boolean
  showComposition: boolean
  showImage: boolean
  fsPrimary: number
  fsPrimaryMode: string
  fsSecondary: number
  fsSecondaryMode: string
  fsSmall: number
  fsSmallMode: string
}> {
  const config = await prisma.adminConfig.findUnique({ where: { id: SINGLETON_ID } })
  return {
    showDescription: config?.showDescription ?? D.showDescription,
    showComposition: config?.showComposition ?? D.showComposition,
    showImage: config?.showImage ?? D.showImage,
    fsPrimary: config?.fsPrimary ?? D.fsPrimary,
    fsPrimaryMode: config?.fsPrimaryMode ?? D.fsPrimaryMode,
    fsSecondary: config?.fsSecondary ?? D.fsSecondary,
    fsSecondaryMode: config?.fsSecondaryMode ?? D.fsSecondaryMode,
    fsSmall: config?.fsSmall ?? D.fsSmall,
    fsSmallMode: config?.fsSmallMode ?? D.fsSmallMode,
  }
}

export async function setShowDescription(showDescription: boolean): Promise<void> {
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { showDescription } })
}

export async function setShowComposition(showComposition: boolean): Promise<void> {
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { showComposition } })
}

export async function setShowImage(showImage: boolean): Promise<void> {
  await prisma.adminConfig.update({ where: { id: SINGLETON_ID }, data: { showImage } })
}

export async function setFontSizes(
  fsPrimary: number, fsPrimaryMode: string,
  fsSecondary: number, fsSecondaryMode: string,
  fsSmall: number, fsSmallMode: string
): Promise<void> {
  await prisma.adminConfig.update({
    where: { id: SINGLETON_ID },
    data: { fsPrimary, fsPrimaryMode, fsSecondary, fsSecondaryMode, fsSmall, fsSmallMode },
  })
}
