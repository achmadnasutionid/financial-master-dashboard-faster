// Script to create test database on Railway
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres:xyElGQbdJufEUsLOOPsPkJcUTuXxrUzh@mainline.proxy.rlwy.net:41156/railway'
});

async function createTestDatabase() {
  try {
    console.log('🔌 Connecting to Railway PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!');
    
    console.log('\n📦 Creating test database...');
    await client.query('CREATE DATABASE railway_test');
    console.log('✅ Database "railway_test" created successfully!');
    
  } catch (error) {
    if (error.code === '42P04') {
      console.log('✅ Database "railway_test" already exists!');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await client.end();
    console.log('\n👋 Disconnected from PostgreSQL');
  }
}

createTestDatabase();
