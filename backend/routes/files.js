const express = require('express');
const router = express.Router();
const { validateUser } = require('../middlewares/auth');
const User = require('../models/user');
const { uploadToS3, getFileFromS3, deleteFromS3, s3 } = require('../config/s3');

// Save file
router.post('/save', validateUser, async (req, res) => {
  try {
    const { content, filename, language, fileId } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);
    
    // If fileId exists, update the existing file
    if (fileId) {
      const existingFile = user.files.find(f => f.s3Key === fileId);
      if (!existingFile) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Update S3
      await s3.putObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileId, // Use fileId directly as the key
        Body: content,
        ContentType: 'text/plain'
      }).promise();
      
      res.status(200).json({ 
        message: 'File updated successfully', 
        fileId: fileId,
        file: existingFile
      });
    } else {
      // Create new file with content
      const s3Key = await uploadToS3(content, filename, userId);
      const newFile = {
        name: filename,
        s3Key,
        language,
        createdAt: new Date()
      };
      user.files.push(newFile);
      await user.save();

      res.status(201).json({ 
        message: 'File created successfully', 
        fileId: s3Key,
        file: newFile
      });
    }
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user files
router.get('/list', validateUser, async (req, res) => {
  try {
    console.log('User from token:', req.user);
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('User not found with id:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Found user:', user.email);
    console.log('User files:', user.files);
    res.json({ files: user.files || [] });
  } catch (error) {
    console.error('Error in /files/list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get file content
router.get('/:fileId', validateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const file = user.files.find(f => f.s3Key === req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await getFileFromS3(file.s3Key);
    res.json({ content, file });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:fileId', validateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const fileIndex = user.files.findIndex(f => f.s3Key === req.params.fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = user.files[fileIndex];
    
    // Delete from S3 first
    await deleteFromS3(file.s3Key);
    console.log('File deleted from S3:', file.s3Key);
    
    // Then remove from user's files array
    user.files.splice(fileIndex, 1);
    await user.save();
    console.log('File removed from user document');

    res.json({ 
      message: 'File deleted successfully', 
      fileId: req.params.fileId 
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
