const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB_NAME || 'staynest';

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log('DB:', dbName);
    console.log('Collections:', collections.map(c => c.name).join(', '));

    const users = await db.collection('users').find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log('\nLatest users (up to 5):');
    console.log(JSON.stringify(users, null, 2));

    const hostels = await db.collection('hostels').find().sort({ id: 1 }).limit(5).toArray();
    console.log('\nHostels (up to 5):');
    console.log(JSON.stringify(hostels, null, 2));

    const bookings = await db.collection('bookings').find().sort({ updatedAt: -1 }).limit(5).toArray();
    console.log('\nBookings (up to 5):');
    console.log(JSON.stringify(bookings, null, 2));

    const usersCount = await db.collection('users').countDocuments();
    const hostelsCount = await db.collection('hostels').countDocuments();
    const bookingsCount = await db.collection('bookings').countDocuments();
    console.log(`\nCounts -> users: ${usersCount}, hostels: ${hostelsCount}, bookings: ${bookingsCount}`);
  } catch (err) {
    console.error('Error inspecting DB:', err.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();
