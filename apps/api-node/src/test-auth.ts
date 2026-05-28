import { auth } from './lib/auth.js'
import { redis } from './lib/redis.js'

async function main() {
  try {
    const testEmail = `test_verification_${Math.random().toString(36).substring(2)}@singrkaraoke.com`
    console.log(`👤 Registering: ${testEmail}`)
    
    await auth.api.signUpEmail({
      body: {
        email: testEmail,
        password: 'password123',
        name: 'Verification Singer',
      }
    })
    
    const signInRes = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: 'password123',
      }
    })
    
    const token = signInRes.token
    console.log(`🔑 Token obtained: ${token}`)
    
    // Log Redis keys
    const keys = await redis.keys('*')
    console.log('All Redis Keys in DB:', keys)
    
    for (const key of keys) {
      if (key.includes(token) || key.includes('session')) {
        const val = await redis.get(key)
        console.log(`Redis Key [${key}] =`, val)
      }
    }
    
  } catch (err) {
    console.error('Error:', err)
  }
  process.exit(0)
}

main()
