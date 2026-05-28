import { rawPrisma as prisma } from '../src/client.js'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import crypto from 'crypto'

const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: process.env.BETTER_AUTH_SECRET || 'dev_secret_replace_in_production_32chars_min',
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    fields: {
      name: 'firstName',
    },
    additionalFields: {
      roles: { type: 'string[]', required: false, defaultValue: ['singer'] },
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      phoneNumber: { type: 'string', required: false },
      isAnonymous: { type: 'boolean', required: false, defaultValue: false },
      businessName: { type: 'string', required: false },
      businessLogo: { type: 'string', required: false },
      businessAbout: { type: 'string', required: false },
      singerAbout: { type: 'string', required: false },
      deletedAt: { type: 'date', required: false },
      deletedBy: { type: 'string', required: false },
    },
  },
})

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Clean existing data in correct dependency order
  console.log('🧹 Cleaning old data...')
  await prisma.favorite.deleteMany()
  await prisma.request.deleteMany()
  await prisma.song.deleteMany()
  await prisma.songShadow.deleteMany()
  await prisma.show.deleteMany()
  await prisma.system.deleteMany()
  await prisma.venue.deleteMany()
  await prisma.hostProfile.deleteMany()
  await prisma.hostTeamMember.deleteMany()
  await prisma.twoFactor.deleteMany()
  await prisma.passkey.deleteMany()
  await prisma.account.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.subscriptionTier.deleteMany()

  // 2. Create Subscription Tiers
  console.log('💳 Seeding Subscription Tiers...')
  const priceProMonthly = 'price_1TOBKUEHv8jD9HNKuH9i3sEy'
  const pricePro6Month = 'price_1TOBKVEHv8jD9HNKcXvrP2Po'
  const priceProAnnual = 'price_1TOBKVEHv8jD9HNKK0nTrlRV'

  const tierProMonthly = await prisma.subscriptionTier.create({
    data: {
      stripePriceId: priceProMonthly,
      name: 'Singr Connect Monthly',
      priceCents: 1500,
      interval: 'month',
      features: { maxVenues: 2, maxSystems: 1, support: 'email', trialDays: 7 },
      active: true,
    },
  })

  const tierPro6Month = await prisma.subscriptionTier.create({
    data: {
      stripePriceId: pricePro6Month,
      name: 'Singr Connect 6-Month',
      priceCents: 7500,
      interval: '6_months',
      features: { maxVenues: 5, maxSystems: 2, support: 'email', trialDays: 7 },
      active: true,
    },
  })

  const tierProAnnual = await prisma.subscriptionTier.create({
    data: {
      stripePriceId: priceProAnnual,
      name: 'Singr Connect Annual',
      priceCents: 13500,
      interval: 'year',
      features: { maxVenues: 50, maxSystems: 10, support: 'priority', trialDays: 14 },
      active: true,
    },
  })

  // 3. Create Users
  console.log('👤 Seeding Users via Better Auth programmatic API...')

  const adminRes = await auth.api.signUpEmail({
    headers: new Headers(),
    body: {
      email: 'admin@singrkaraoke.com',
      password: 'password123',
      name: 'System Administrator',
      firstName: 'System',
      lastName: 'Administrator',
      roles: ['global_admin'],
    },
  })
  const admin = await prisma.user.update({
    where: { id: adminRes.user.id },
    data: { emailVerified: true }
  })

  const hostRes = await auth.api.signUpEmail({
    headers: new Headers(),
    body: {
      email: 'host@singrkaraoke.com',
      password: 'password123',
      name: 'Johnny Host',
      firstName: 'Johnny',
      lastName: 'Host',
      roles: ['host', 'singer'],
      businessName: 'Johnny Karaoke Entertainment',
      businessAbout: 'Providing the finest karaoke hosting services in the tri-state area since 2012.',
    },
  })
  const host = await prisma.user.update({
    where: { id: hostRes.user.id },
    data: { emailVerified: true }
  })

  const singer1Res = await auth.api.signUpEmail({
    headers: new Headers(),
    body: {
      email: 'singer1@singrkaraoke.com',
      password: 'password123',
      name: 'Alice Singer',
      firstName: 'Alice',
      lastName: 'Singer',
      roles: ['singer'],
      singerAbout: 'Lead singer in a local indie band. Loves 80s synth-pop and power ballads.',
    },
  })
  const singer1 = await prisma.user.update({
    where: { id: singer1Res.user.id },
    data: { emailVerified: true }
  })

  const singer2Res = await auth.api.signUpEmail({
    headers: new Headers(),
    body: {
      email: 'singer2@singrkaraoke.com',
      password: 'password123',
      name: 'Bob Vocalist',
      firstName: 'Bob',
      lastName: 'Vocalist',
      roles: ['singer'],
      singerAbout: 'Shower singer extraordinaire. Mostly sings classic rock.',
    },
  })
  const singer2 = await prisma.user.update({
    where: { id: singer2Res.user.id },
    data: { emailVerified: true }
  })

  // 4. Create Host Profile
  console.log('📋 Seeding Host Profile...')
  await prisma.hostProfile.create({
    data: {
      userId: host.id,
      stripeCustomerId: 'cus_test_host123',
      subscriptionStatus: 'active',
    },
  })

  // 5. Create Venues
  console.log('🏢 Seeding Venues...')
  const publicVenue = await prisma.venue.create({
    data: {
      name: 'The Glass Bar & Grill',
      address1: '123 Crystal Avenue',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      lat: 30.2672,
      lon: -97.7431,
      placeType: 'bar',
      isPrivate: false,
      createdBy: host.id,
      hoursOfOperation: {
        monday: '16:00-02:00',
        tuesday: '16:00-02:00',
        wednesday: '16:00-02:00',
        thursday: '16:00-02:00',
        friday: '12:00-02:00',
        saturday: '12:00-02:00',
        sunday: '12:00-02:00',
      },
    },
  })

  const privateVenue = await prisma.venue.create({
    data: {
      name: 'Private Lounge Austin',
      address1: '456 Hidden Alleyway',
      city: 'Austin',
      state: 'TX',
      zip: '78704',
      lat: 30.2456,
      lon: -97.7645,
      placeType: 'lounge',
      isPrivate: true,
      createdBy: host.id,
    },
  })

  // 6. Create Hardware Systems
  console.log('💻 Seeding Systems...')
  const system1 = await prisma.system.create({
    data: {
      hostUsersId: host.id,
      apiKey: 'test_api_key_johnny_1',
      systemNumber: 1,
      createdBy: host.id,
    },
  })

  const system2 = await prisma.system.create({
    data: {
      hostUsersId: host.id,
      apiKey: 'test_api_key_johnny_2',
      systemNumber: 2,
      createdBy: host.id,
    },
  })

  // 7. Create Shows
  console.log('🎤 Seeding Shows...')
  const publicShow = await prisma.show.create({
    data: {
      venuesId: publicVenue.id,
      hostUsersId: host.id,
      showName: 'Friday Glass Karaoke',
      slug: 'friday-glass',
      isAccepting: true,
      activeSystemsId: system1.id,
      serialCounter: 10,
      createdBy: host.id,
    },
  })

  const privateShow = await prisma.show.create({
    data: {
      venuesId: privateVenue.id,
      hostUsersId: host.id,
      showName: 'VIP Private Party',
      slug: 'vip-party',
      pinCode: '7788',
      isAccepting: false,
      activeSystemsId: system2.id,
      serialCounter: 1,
      createdBy: host.id,
    },
  })

  // 8. Create Sample Songs
  console.log('🎶 Seeding Songs (50 items)...')
  const songTemplates = [
    { title: 'Bohemian Rhapsody', artist: 'Queen', brand: 'SC' },
    { title: 'Don\'t Stop Believin\'', artist: 'Journey', brand: 'DK' },
    { title: 'Billie Jean', artist: 'Michael Jackson', brand: 'SC' },
    { title: 'Sweet Caroline', artist: 'Neil Diamond', brand: 'SF' },
    { title: 'Hotel California', artist: 'Eagles', brand: 'DK' },
    { title: 'Livin\' on a Prayer', artist: 'Bon Jovi', brand: 'SC' },
    { title: 'I Will Survive', artist: 'Gloria Gaynor', brand: 'SF' },
    { title: 'Dancing Queen', artist: 'ABBA', brand: 'SC' },
    { title: 'Wonderwall', artist: 'Oasis', brand: 'DK' },
    { title: 'Hey Jude', artist: 'The Beatles', brand: 'SF' },
    { title: 'Rolling in the Deep', artist: 'Adele', brand: 'SC' },
    { title: 'Superstition', artist: 'Stevie Wonder', brand: 'DK' },
    { title: 'All of Me', artist: 'John Legend', brand: 'SF' },
    { title: 'Uptown Funk', artist: 'Bruno Mars', brand: 'SC' },
    { title: 'Creep', artist: 'Radiohead', brand: 'DK' },
    { title: 'Purple Rain', artist: 'Prince', brand: 'SF' },
    { title: 'Take Me Home, Country Roads', artist: 'John Denver', brand: 'SC' },
    { title: 'Someone Like You', artist: 'Adele', brand: 'DK' },
    { title: 'Ain\'t No Sunshine', artist: 'Bill Withers', brand: 'SF' },
    { title: 'Fly Me to the Moon', artist: 'Frank Sinatra', brand: 'SC' },
    { title: 'Zombie', artist: 'The Cranberries', brand: 'DK' },
    { title: 'Stayin\' Alive', artist: 'Bee Gees', brand: 'SF' },
    { title: 'Summer of \'69', artist: 'Bryan Adams', brand: 'SC' },
    { title: 'Piano Man', artist: 'Billy Joel', brand: 'DK' },
    { title: 'Mr. Brightside', artist: 'The Killers', brand: 'SF' },
  ]

  const seededSongs: any[] = []

  // Create 50 songs (duplicate templates with different brands or formats if needed)
  for (let i = 0; i < 50; i++) {
    const template = songTemplates[i % songTemplates.length]
    const song = await prisma.song.create({
      data: {
        systemsId: system1.id,
        title: i >= songTemplates.length ? `${template.title} (Alt Mix)` : template.title,
        artist: template.artist,
        brand: i % 3 === 0 ? 'SC' : i % 3 === 1 ? 'DK' : 'SF',
      },
    })
    seededSongs.push(song)
  }

  // 9. Create Sample Requests
  console.log('📨 Seeding Requests...')
  await prisma.request.create({
    data: {
      systemsId: system1.id,
      showsId: publicShow.id,
      usersId: singer1.id,
      singerName: 'Alice',
      songsId: seededSongs[0].id,
      keyChange: 0,
      status: 'pending',
    },
  })

  await prisma.request.create({
    data: {
      systemsId: system1.id,
      showsId: publicShow.id,
      usersId: singer2.id,
      singerName: 'Bob',
      songsId: seededSongs[1].id,
      keyChange: -2,
      status: 'pending',
    },
  })

  await prisma.request.create({
    data: {
      systemsId: system1.id,
      showsId: publicShow.id,
      usersId: null,
      singerName: 'Guest Charlie',
      songsId: seededSongs[2].id,
      keyChange: 1,
      status: 'processed',
    },
  })

  // 10. Create Favorites
  console.log('⭐ Seeding Favorites...')
  await prisma.favorite.create({
    data: {
      usersId: singer1.id,
      artist: seededSongs[0].artist,
      title: seededSongs[0].title,
    },
  })

  await prisma.favorite.create({
    data: {
      usersId: singer1.id,
      artist: seededSongs[3].artist,
      title: seededSongs[3].title,
    },
  })

  await prisma.favorite.create({
    data: {
      usersId: singer2.id,
      artist: seededSongs[1].artist,
      title: seededSongs[1].title,
    },
  })

  console.log('✅ Database seeding completed successfully!')
  console.log('\n--- Seeded User Credentials ---')
  console.log('🔑 Password for all accounts: password123\n')
  console.log(`👤 Admin:    ${admin.email}`)
  console.log(`👤 Host:     ${host.email}`)
  console.log(`👤 Singer 1: ${singer1.email}`)
  console.log(`👤 Singer 2: ${singer2.email}`)
  console.log('-------------------------------\n')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
