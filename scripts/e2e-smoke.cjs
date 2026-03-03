const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const out = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    out[key] = value
  }
  return out
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function main() {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) {
    throw new Error('.env not found in project root')
  }

  const env = loadEnv(envPath)
  const supabaseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  assertTrue(!!supabaseUrl, 'Missing VITE_SUPABASE_URL')
  assertTrue(!!anonKey, 'Missing VITE_SUPABASE_ANON_KEY')
  assertTrue(!!serviceRoleKey, 'Missing SUPABASE_SERVICE_ROLE_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const createdUserIds = []
  const testPrefix = `e2e_${Date.now()}`

  const ownerEmail = `${testPrefix}_owner@test.local`
  const userEmail = `${testPrefix}_user@test.local`
  const user2Email = `${testPrefix}_user2@test.local`
  const pass = 'Test@12345678'

  let ownerId = null
  let userId = null
  let user2Id = null
  let spaceId = null
  let bookingId1 = null
  let bookingId2 = null
  let bookingId3 = null

  const log = (msg) => console.log(`[E2E] ${msg}`)

  async function createUserWithProfile(email, role, fullName) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })
    if (error) throw error
    const id = data.user.id
    createdUserIds.push(id)

    const { error: profileError } = await admin.from('profiles').upsert({
      id,
      email,
      full_name: fullName,
      role,
      phone_number: null,
    })
    if (profileError) throw profileError
    return id
  }

  async function signIn(email) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await client.auth.signInWithPassword({ email, password: pass })
    if (error) throw error
    return client
  }

  try {
    log('Creating users and profiles')
    ownerId = await createUserWithProfile(ownerEmail, 'owner', 'E2E Owner')
    userId = await createUserWithProfile(userEmail, 'user', 'E2E User')
    user2Id = await createUserWithProfile(user2Email, 'user', 'E2E User 2')

    log('Creating owner parking space with constrained capacity')
    const { data: spaceData, error: spaceErr } = await admin
      .from('parking_spaces')
      .insert({
        owner_id: ownerId,
        address: 'E2E Street 1',
        district: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        hourly_rate: 50,
        two_wheeler_capacity: 1,
        four_wheeler_capacity: 1,
        heavy_vehicle_capacity: 0,
        location: { lat: 13.0827, lng: 80.2707 },
      })
      .select('id')
      .single()
    if (spaceErr) throw spaceErr
    spaceId = spaceData.id

    log('Testing login lockout helper functions')
    const lockEmail = `${testPrefix}_lock@test.local`
    for (let i = 0; i < 4; i += 1) {
      const { data, error } = await publicClient.rpc('record_failed_login_attempt', {
        p_email: lockEmail,
        p_ip: null,
      })
      if (error) throw error
      assertTrue(data === null, 'Lockout triggered too early')
    }
    const { data: lockAt, error: lockErr } = await publicClient.rpc('record_failed_login_attempt', {
      p_email: lockEmail,
      p_ip: null,
    })
    if (lockErr) throw lockErr
    assertTrue(!!lockAt, 'Lockout did not trigger on 5th failed attempt')

    const { data: activeLock, error: activeLockErr } = await publicClient.rpc('is_account_locked', {
      p_email: lockEmail,
    })
    if (activeLockErr) throw activeLockErr
    assertTrue(!!activeLock, 'Lockout not detected after threshold')

    const { error: clearErr } = await publicClient.rpc('clear_failed_login_attempts', {
      p_email: lockEmail,
    })
    if (clearErr) throw clearErr

    const { data: clearedLock, error: clearedLockErr } = await publicClient.rpc('is_account_locked', {
      p_email: lockEmail,
    })
    if (clearedLockErr) throw clearedLockErr
    assertTrue(clearedLock === null, 'Lockout not cleared after clear_failed_login_attempts')

    log('Signing in primary user and creating booking')
    const userClient = await signIn(userEmail)
    const start1 = new Date(Date.now() + 2 * 60 * 60 * 1000)
    const end1 = new Date(start1.getTime() + 60 * 60 * 1000)

    const { data: available, error: availableErr } = await userClient.rpc('check_time_slot_availability', {
      p_parking_space_id: spaceId,
      p_vehicle_type: 'four-wheeler',
      p_start_time: start1.toISOString(),
      p_end_time: end1.toISOString(),
    })
    if (availableErr) throw availableErr
    assertTrue(available === true, 'Expected availability before first booking')

    const { data: createdBookingId, error: bookingErr } = await userClient.rpc('create_parking_booking', {
      p_user_id: userId,
      p_parking_space_id: spaceId,
      p_slot_number: '',
      p_vehicle_type: 'four-wheeler',
      p_vehicle_number: 'TN01AB1234',
      p_start_time: start1.toISOString(),
      p_end_time: end1.toISOString(),
      p_amount: 50,
      p_user_name: 'E2E User',
      p_user_email: userEmail,
      p_payment_method: 'online',
    })
    if (bookingErr) throw bookingErr
    bookingId1 = createdBookingId
    assertTrue(!!bookingId1, 'Booking ID not returned')

    const { data: bookingRow, error: bookingRowErr } = await admin
      .from('bookings')
      .select('status, amount, owner_id, user_id')
      .eq('id', bookingId1)
      .single()
    if (bookingRowErr) throw bookingRowErr
    assertTrue(bookingRow.status === 'active', 'Booking should be active after create')
    assertTrue(Number(bookingRow.amount) === 50, 'Booking amount mismatch')

    const { data: paymentRow, error: paymentErr } = await admin
      .from('payments')
      .select('status, payment_method')
      .eq('booking_id', bookingId1)
      .single()
    if (paymentErr) throw paymentErr
    assertTrue(paymentRow.status === 'completed', 'Payment should be completed after create')

    log('Overbooking edge case: second user overlapping booking should fail')
    const user2Client = await signIn(user2Email)
    const { error: overbookErr } = await user2Client.rpc('create_parking_booking', {
      p_user_id: user2Id,
      p_parking_space_id: spaceId,
      p_slot_number: '',
      p_vehicle_type: 'four-wheeler',
      p_vehicle_number: 'TN09ZZ0001',
      p_start_time: start1.toISOString(),
      p_end_time: end1.toISOString(),
      p_amount: 50,
      p_user_name: 'E2E User 2',
      p_user_email: user2Email,
      p_payment_method: 'online',
    })
    assertTrue(!!overbookErr, 'Overbooking should have failed but succeeded')

    log('Cancel booking happy path')
    const { data: cancelOk, error: cancelErr } = await userClient.rpc('cancel_booking', {
      p_booking_id: bookingId1,
      p_cancelled_by_user_id: userId,
    })
    if (cancelErr) throw cancelErr
    assertTrue(cancelOk === true, 'Expected successful cancellation')

    const { data: refundedPayment, error: refundedErr } = await admin
      .from('payments')
      .select('status')
      .eq('booking_id', bookingId1)
      .single()
    if (refundedErr) throw refundedErr
    assertTrue(refundedPayment.status === 'refunded', 'Payment should be refunded after cancellation')

    log('Cancel edge case: within 30 minutes should fail')
    const nearStart = new Date(Date.now() + 20 * 60 * 1000)
    const nearEnd = new Date(nearStart.getTime() + 40 * 60 * 1000)
    const { data: booking2Id, error: booking2Err } = await userClient.rpc('create_parking_booking', {
      p_user_id: userId,
      p_parking_space_id: spaceId,
      p_slot_number: '',
      p_vehicle_type: 'four-wheeler',
      p_vehicle_number: 'TN01AB5678',
      p_start_time: nearStart.toISOString(),
      p_end_time: nearEnd.toISOString(),
      p_amount: 50,
      p_user_name: 'E2E User',
      p_user_email: userEmail,
      p_payment_method: 'online',
    })
    if (booking2Err) throw booking2Err
    bookingId2 = booking2Id

    const { error: cancelNearErr } = await userClient.rpc('cancel_booking', {
      p_booking_id: bookingId2,
      p_cancelled_by_user_id: userId,
    })
    assertTrue(!!cancelNearErr, 'Cancellation within 30 minutes should fail')

    log('Completion job + idempotence edge case')
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const pastEnd = new Date(Date.now() - 60 * 60 * 1000)
    const { data: booking3Id, error: booking3Err } = await userClient.rpc('create_parking_booking', {
      p_user_id: userId,
      p_parking_space_id: spaceId,
      p_slot_number: '',
      p_vehicle_type: 'two-wheeler',
      p_vehicle_number: 'TN11PA0001',
      p_start_time: pastStart.toISOString(),
      p_end_time: pastEnd.toISOString(),
      p_amount: 30,
      p_user_name: 'E2E User',
      p_user_email: userEmail,
      p_payment_method: 'online',
    })
    if (booking3Err) throw booking3Err
    bookingId3 = booking3Id

    const { error: processErr1 } = await admin.rpc('process_completed_bookings_job')
    if (processErr1) throw processErr1

    const { data: completedRow, error: completedErr } = await admin
      .from('bookings')
      .select('status')
      .eq('id', bookingId3)
      .single()
    if (completedErr) throw completedErr
    assertTrue(completedRow.status === 'completed', 'Past booking should be marked completed by job')

    const { count: txCount1, error: txErr1 } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId3)
      .eq('type', 'parking_earning')
      .eq('status', 'completed')
    if (txErr1) throw txErr1

    const { error: processErr2 } = await admin.rpc('process_completed_bookings_job')
    if (processErr2) throw processErr2

    const { count: txCount2, error: txErr2 } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId3)
      .eq('type', 'parking_earning')
      .eq('status', 'completed')
    if (txErr2) throw txErr2

    assertTrue((txCount1 ?? 0) === 1, 'Expected exactly one earning transaction after first job run')
    assertTrue((txCount2 ?? 0) === 1, 'Earning transaction duplicated on second job run')

    log('All backend E2E smoke checks passed')
  } finally {
    log('Cleaning up test data')
    if (spaceId) {
      await admin.from('payments').delete().in('booking_id', [bookingId1, bookingId2, bookingId3].filter(Boolean))
      await admin.from('notifications').delete().in('booking_id', [bookingId1, bookingId2, bookingId3].filter(Boolean))
      await admin.from('transactions').delete().in('booking_id', [bookingId1, bookingId2, bookingId3].filter(Boolean))
      await admin.from('bookings').delete().in('id', [bookingId1, bookingId2, bookingId3].filter(Boolean))
      await admin.from('wallets').delete().in('user_id', [ownerId, userId, user2Id].filter(Boolean))
      await admin.from('parking_spaces').delete().eq('id', spaceId)
    }

    if (createdUserIds.length > 0) {
      await admin.from('profiles').delete().in('id', createdUserIds)
      for (const id of createdUserIds) {
        await admin.auth.admin.deleteUser(id)
      }
    }
  }
}

main().catch((error) => {
  console.error('[E2E] FAILED')
  console.error(error)
  process.exit(1)
})
