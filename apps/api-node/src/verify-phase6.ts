import { io as Client } from 'socket.io-client'
import { prisma } from '@singr/db'
import { auth } from './lib/auth.js'

async function runVerification() {
  console.log('🏁 Starting Phase 6 Dynamic Verification Test...')

  // 1. Get seed data
  const system = await prisma.system.findFirst({
    where: { apiKey: 'test_api_key_johnny_1' },
  })
  if (!system) throw new Error('Seed system not found')

  const show = await prisma.show.findFirst({
    where: { slug: 'friday-glass' },
  })
  if (!show) throw new Error('Seed show not found')

  // Find a song in the library
  const song = await prisma.song.findFirst({
    where: { systemsId: system.id },
  })
  if (!song) throw new Error('No songs found in systems library. Ensure db is seeded!')

  console.log(`🎤 Found active show: ${show.showName} (${show.id})`)
  console.log(`🎶 Found song: "${song.title}" by ${song.artist} (${song.id})`)

  // 2. Programmatically sign up a fresh test user
  const testEmail = `test_verification_${Math.random().toString(36).substring(2)}@singrkaraoke.com`
  console.log(`👤 Registering test user: ${testEmail}...`)
  
  await auth.api.signUpEmail({
    body: {
      email: testEmail,
      password: 'password123',
      name: 'Verification Singer',
    }
  })
  
  console.log('👤 Signing in to obtain a persistent DB session...')
  const signInRes = await auth.api.signInEmail({
    body: {
      email: testEmail,
      password: 'password123',
    }
  })

  const token = signInRes.token
  const user = signInRes.user
  console.log(`✅ Signed in successfully! User ID: ${user.id}`)
  console.log(`🔑 Obtained Better Auth session token: ${token}`)

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Cookie': `singr.session=${token}`,
    'Content-Type': 'application/json',
  }

  // 3. Connect to WebSocket Server
  console.log('🔌 Connecting to WebSocket server...')
  const socket = Client('http://localhost:3001', {
    extraHeaders: {
      'Authorization': `Bearer ${token}`
    }
  })

  let resolveNewRequest: any
  const newRequestPromise = new Promise((resolve) => {
    resolveNewRequest = resolve
  })

  let resolveSongsSynced: any
  const songsSyncedPromise = new Promise((resolve) => {
    resolveSongsSynced = resolve
  })

  let resolveRequestCancelled: any
  const requestCancelledPromise = new Promise((resolve) => {
    resolveRequestCancelled = resolve
  })

  socket.on('connect', () => {
    console.log(`🔌 WebSocket connected! Socket ID: ${socket.id}`)
    console.log(`🚪 Joining room: show:${show.id}`)
    socket.emit('join_show', show.id)
  })

  socket.on('new_request', (data) => {
    console.log('📢 WebSocket Event Received: [new_request]', data)
    resolveNewRequest(data)
  })

  socket.on('songs_synced', (data) => {
    console.log('📢 WebSocket Event Received: [songs_synced]', data)
    resolveSongsSynced(data)
  })

  socket.on('request_cancelled', (data) => {
    console.log('📢 WebSocket Event Received: [request_cancelled]', data)
    resolveRequestCancelled(data)
  })

  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err)
  })

  // Give socket a second to connect and join room
  await new Promise((r) => setTimeout(r, 1000))

  // 4. Test Case A: Submit Request via modern REST API
  console.log('🧪 Test Case A: Submitting song request via REST...')
  const submitRes = await fetch('http://localhost:3001/api/v1/requests', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      showId: show.id,
      songId: song.id,
      singerName: 'Alice Verification',
      keyChange: 0,
    }),
  })

  const submitData: any = await submitRes.json()
  if (!submitRes.ok || !submitData.success) {
    throw new Error(`Failed to submit request: ${JSON.stringify(submitData)}`)
  }

  const createdRequest = submitData.request
  console.log(`✅ Request submitted successfully. ID: ${createdRequest.id}`)

  // Wait for the WS event with timeout
  console.log('⏳ Waiting for new_request WebSocket notification...')
  const receivedNewRequest = await Promise.race([
    newRequestPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for new_request')), 5000))
  ]) as any
  
  if (receivedNewRequest.id === createdRequest.id) {
    console.log('💯 Test Case A PASSED!')
  } else {
    throw new Error('Test Case A FAILED: Mismatched request ID')
  }

  // 5. Test Case B: Debounced Song Sync via Legacy API and BullMQ
  console.log('🧪 Test Case B: Simulating legacy addSongs to trigger debounced sync...')
  const syncRes = await fetch('http://localhost:3001/api/v1/legacy/okj/api.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      command: 'addSongs',
      api_key: system.apiKey,
      system_id: system.systemNumber,
      songs: [
        { artist: 'Verification Artist', title: 'Verification Song 1' },
        { artist: 'Verification Artist', title: 'Verification Song 2' }
      ]
    })
  })

  const syncData: any = await syncRes.json()
  if (syncRes.status !== 200 || syncData.error !== 'false') {
    throw new Error(`Failed legacy addSongs command: ${JSON.stringify(syncData)}`)
  }
  console.log(`✅ Songs shadow staged. Entries processed: ${syncData['entries processed']}`)
  console.log('⏳ Waiting for BullMQ debounce worker to process shadow-swap (approx 5-7 seconds)...')

  const receivedSongsSynced = await Promise.race([
    songsSyncedPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for songs_synced')), 12000))
  ]) as any

  console.log('📢 Received songs_synced notification details:', receivedSongsSynced)
  console.log('💯 Test Case B PASSED!')

  // Check if live songs actually contain our sync songs
  const liveSong = await prisma.song.findFirst({
    where: {
      systemsId: system.id,
      artist: 'Verification Artist',
      title: 'Verification Song 1',
    }
  })
  if (liveSong) {
    console.log(`✅ Verified: Live song successfully updated in Database!`)
  } else {
    throw new Error('Verification song not found in live songs table!')
  }

  // 6. Test Case C: Request soft-delete via REST
  console.log('🧪 Test Case C: Submitting a new request first...')
  const newSong = await prisma.song.findFirst({
    where: { systemsId: system.id },
  })
  if (!newSong) throw new Error('No songs found after sync')

  const tempSubmitRes = await fetch('http://localhost:3001/api/v1/requests', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      showId: show.id,
      songId: newSong.id,
      singerName: 'Alice Verification',
      keyChange: 0,
    }),
  })
  const tempSubmitData: any = await tempSubmitRes.json()
  if (!tempSubmitRes.ok || !tempSubmitData.success) {
    throw new Error(`Failed to submit request for Test Case C: ${JSON.stringify(tempSubmitData)}`)
  }
  const tempRequest = tempSubmitData.request
  console.log(`✅ Temporary request created. ID: ${tempRequest.id}`)

  console.log('🧪 Test Case C: Cancelling request to trigger real-time delete event...')
  const deleteRes = await fetch(`http://localhost:3001/api/v1/requests/${tempRequest.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  })

  const deleteData: any = await deleteRes.json()
  if (!deleteRes.ok || !deleteData.success) {
    throw new Error(`Failed to delete request: ${JSON.stringify(deleteData)}`)
  }
  console.log('✅ Request cancelled successfully')

  // Wait for the WS event with timeout
  console.log('⏳ Waiting for request_cancelled WebSocket notification...')
  const receivedRequestCancelled = await Promise.race([
    requestCancelledPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for request_cancelled')), 5000))
  ]) as any

  if (receivedRequestCancelled.requestId === tempRequest.id) {
    console.log('💯 Test Case C PASSED!')
  } else {
    throw new Error('Test Case C FAILED: Mismatched request ID in cancellation')
  }

  // 7. Cleanup
  console.log('🧹 Cleaning up test user and relations...')
  await prisma.account.deleteMany({ where: { userId: user.id } })
  await prisma.session.deleteMany({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
  
  socket.disconnect()
  console.log('🎉 ALL PHASE 6 REAL-TIME & WORKER TESTS PASSED SUCCESSFULLY!')
  process.exit(0)
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})
