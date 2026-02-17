// Script to fix test database by creating missing Product table
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres:xyElGQbdJufEUsLOOPsPkJcUTuXxrUzh@mainline.proxy.rlwy.net:41156/railway_test'
});

async function fixTestDatabase() {
  try {
    console.log('🔌 Connecting to test database...');
    await client.connect();
    console.log('✅ Connected!');
    
    console.log('\n🔧 Creating Product table if missing...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "deletedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✅ Product table created!');
    
    console.log('\n🔧 Creating unique index on Product.name...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Product_name_key" ON "Product"("name");
    `);
    console.log('✅ Index created!');
    
    console.log('\n🔧 Creating index on Product.deletedAt...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS "Product_deletedAt_idx" ON "Product"("deletedAt");
    `);
    console.log('✅ Index created!');
    
    console.log('\n✅ Test database fixed! Now you can run migrations.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n👋 Disconnected from test database');
  }
}

fixTestDatabase();
