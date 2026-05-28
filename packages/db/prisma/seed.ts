import { rawPrisma as prisma } from '../src/client.js'

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
  const pricePro = 'price_1RP51fEHv8jD9HNKrNZ75uvC'
  const pricePremium = 'price_1RP51fEHv8jD9HNKKUJVK37N'

  const tierPro = await prisma.subscriptionTier.create({
    data: {
      stripePriceId: pricePro,
      name: 'Singr Pro',
      priceCents: 4900,
      interval: 'month',
      features: { maxVenues: 5, maxSystems: 2, support: 'email' },
      active: true,
    },
  })

  const tierPremium = await prisma.subscriptionTier.create({
    data: {
      stripePriceId: pricePremium,
      name: 'Singr Premium',
      priceCents: 9900,
      interval: 'month',
      features: { maxVenues: 50, maxSystems: 10, support: 'priority' },
      active: true,
    },
  })

  // 3. Create Users
  console.log('👤 Seeding Users...')
  // bcrypt hash of "password123"
  const defaultPasswordHash = '$2b$10$zR8W276xRszvQn09cW4pA.b0jC19a/589ZpE5iYmKqF798o6b4/dK'

  const admin = await prisma.user.create({
    data: {
      email: 'admin@singrkaraoke.com',
      password: defaultPasswordHash,
      emailVerified: true,
      roles: ['global_admin'],
      firstName: 'System',
      lastName: 'Administrator',
    },
  })

  const host = await prisma.user.create({
    data: {
      email: 'host@singrkaraoke.com',
      password: defaultPasswordHash,
      emailVerified: true,
      roles: ['host', 'singer'],
      firstName: 'Johnny',
      lastName: 'Host',
      businessName: 'Johnny Karaoke Entertainment',
      businessAbout: 'Providing the finest karaoke hosting services in the tri-state area since 2012.',
    },
  })

  const singer1 = await prisma.user.create({
    data: {
      email: 'singer1@singrkaraoke.com',
      password: defaultPasswordHash,
      emailVerified: true,
      roles: ['singer'],
      firstName: 'Alice',
      lastName: 'Singer',
      singerAbout: 'Lead singer in a local indie band. Loves 80s synth-pop and power ballads.',
    },
  })

  const singer2 = await prisma.user.create({
    data: {
      email: 'singer2@singrkaraoke.com',
      password: defaultPasswordHash,
      emailVerified: true,
      roles: ['singer'],
      firstName: 'Bob',
      lastName: 'Vocalist',
      singerAbout: 'Shower singer extraordinaire. Mostly sings classic rock.',
    },
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
