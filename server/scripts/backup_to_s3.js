const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.AWS_S3_BUCKET || 'shopindia-assets';

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `shopindia_backup_${timestamp}.sql.gz`;
  const tempSql = path.join('/tmp', `db_${timestamp}.sql`);
  const tempGz = path.join('/tmp', filename);

  console.log(`[${new Date().toISOString()}] Starting database backup...`);

  try {
    // 1. Run pg_dump
    console.log('Running pg_dump...');
    execSync(`PGPASSWORD='ShopIndia2005!' pg_dump -h localhost -p 5432 -U shopindia_user -d shopindia -F p -f "${tempSql}"`);

    // 2. Compress the SQL dump
    console.log('Compressing backup...');
    const input = fs.createReadStream(tempSql);
    const output = fs.createWriteStream(tempGz);
    const gzip = zlib.createGzip();

    await new Promise((resolve, reject) => {
      input.pipe(gzip).pipe(output).on('finish', resolve).on('error', reject);
    });

    const fileStats = fs.statSync(tempGz);
    console.log(`Compressed size: ${(fileStats.size / 1024).toFixed(2)} KB`);

    // 3. Upload to S3
    const fileStream = fs.createReadStream(tempGz);
    const s3Key = `db-backups/${filename}`;
    console.log(`Uploading to s3://${BUCKET}/${s3Key}...`);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: fileStream,
      ContentType: 'application/gzip'
    }));

    console.log(`✅ Backup successfully uploaded to S3: s3://${BUCKET}/${s3Key}`);

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    // Clean up temp files
    if (fs.existsSync(tempSql)) fs.unlinkSync(tempSql);
    if (fs.existsSync(tempGz)) fs.unlinkSync(tempGz);
    console.log('Temporary files cleaned up.');
  }
}

backup();
