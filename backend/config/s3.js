const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS with credentials explicitly
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create a single S3 instance
const s3Client = new AWS.S3();

// Check S3 connection by listing buckets
const checkS3Connection = async () => {
  try {
    console.log('Attempting to connect to AWS S3...');
    console.log('Using bucket:', process.env.AWS_S3_BUCKET);
    console.log('Region:', process.env.AWS_REGION);
    
    const data = await s3Client.listBuckets().promise();
    console.log('Successfully connected to AWS S3');
    console.log('Available buckets:', data.Buckets.map(b => b.Name).join(', '));
  } catch (error) {
    console.error('Failed to connect to AWS S3:', error.message);
    throw error;
  }
};

// Call connection check when module is loaded
checkS3Connection();

const uploadToS3 = async (fileContent, fileName, userId) => {
  const key = `${userId}/${fileName}`;
  try {
    const data = await s3Client.upload({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: 'text/plain'
    }).promise();
    return data.Key;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

const deleteFromS3 = async (key) => {
  try {
    await s3Client.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }).promise();
  } catch (error) {
    console.error('S3 delete error:', error);
    throw error;
  }
};

const getFileFromS3 = async (key) => {
  try {
    const data = await s3Client.getObject({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    }).promise();
    return data.Body.toString('utf-8');
  } catch (error) {
    console.error('S3 download error:', error);
    throw error;
  }
};

module.exports = { 
  uploadToS3, 
  getFileFromS3,
  deleteFromS3,
  checkS3Connection,
  s3: s3Client // added export for raw s3 client
};
