import { PrismaClient, ItemType } from '@prisma/client'
import { randomUUID } from 'node:crypto'

if (process.env['NODE_ENV'] === 'production') {
  throw new Error('Seed script must not run in production — it wipes all data.')
}

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.dailyCounter.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.category.deleteMany()
  await prisma.table.deleteMany()

  const coffee = await prisma.category.create({ data: { name: 'Coffee', sortOrder: 0 } })
  const other  = await prisma.category.create({ data: { name: 'Other',  sortOrder: 1 } })

  await prisma.menuItem.createMany({
    data: [
      { name: 'Espresso',    description: 'Single shot — intense and concentrated',          categoryId: coffee.id, type: ItemType.COFFEE, ee: 1, me: 0,   sortOrder: 0 },
      { name: 'Doppio',      description: 'Double espresso shot',                            categoryId: coffee.id, type: ItemType.COFFEE, ee: 2, me: 0,   sortOrder: 1 },
      { name: 'Americano',   description: 'Espresso lengthened with hot water',              categoryId: coffee.id, type: ItemType.COFFEE, ee: 1, me: 0,   sortOrder: 2 },
      { name: 'Cappuccino',  description: 'Espresso with steamed milk and thick foam',       categoryId: coffee.id, type: ItemType.COFFEE, ee: 1, me: 120, sortOrder: 3 },
      { name: 'Latte',       description: 'Espresso with a generous pour of steamed milk',   categoryId: coffee.id, type: ItemType.COFFEE, ee: 1, me: 200, sortOrder: 4 },
      { name: 'Flat White',  description: 'Double ristretto with velvety microfoam',         categoryId: coffee.id, type: ItemType.COFFEE, ee: 2, me: 150, sortOrder: 5 },
      { name: 'Macchiato',   description: 'Espresso with a small mark of steamed milk',      categoryId: coffee.id, type: ItemType.COFFEE, ee: 1, me: 30,  sortOrder: 6 },
    ],
  })

  await prisma.menuItem.createMany({
    data: [
      { name: 'English Breakfast Tea', description: 'Classic black tea — milk served on the side', categoryId: other.id, type: ItemType.OTHER, ee: 0, me: 0,   sortOrder: 0 },
      { name: 'Green Tea',             description: 'Light and delicate',                           categoryId: other.id, type: ItemType.OTHER, ee: 0, me: 0,   sortOrder: 1 },
      { name: 'Hot Chocolate',         description: 'Rich cocoa with steamed milk',                 categoryId: other.id, type: ItemType.OTHER, ee: 0, me: 200, sortOrder: 2 },
      { name: 'Orange Juice',          description: 'Freshly squeezed',                            categoryId: other.id, type: ItemType.OTHER, ee: 0, me: 0,   sortOrder: 3 },
      { name: 'Sparkling Water',       description: '330 ml bottle',                               categoryId: other.id, type: ItemType.OTHER, ee: 0, me: 0,   sortOrder: 4 },
    ],
  })

  await prisma.table.create({
    data: { id: 'bar', number: 0, label: 'Bar', qrToken: 'bar' },
  })

  await prisma.table.createMany({
    data: [
      { number: 1, label: 'Window 1', qrToken: randomUUID() },
      { number: 2, label: 'Window 2', qrToken: randomUUID() },
      { number: 3, label: 'Inside 1', qrToken: randomUUID() },
      { number: 4, label: 'Inside 2', qrToken: randomUUID() },
      { number: 5, label: 'Inside 3', qrToken: randomUUID() },
    ],
  })

  const [categoryCount, itemCount, tableCount] = await Promise.all([
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.table.count(),
  ])

  console.log(`Done: ${categoryCount} categories, ${itemCount} menu items, ${tableCount} tables`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
