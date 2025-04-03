const mongoose = require('mongoose');
const { Schema } = mongoose;

const fileSchema = new Schema({
  name: String,
  s3Key: String,
  language: String,
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true
    },
    name: { 
        type: String, 
        required: true,
        trim: true 
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    files: [fileSchema]
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// This will create a collection named 'users' in MongoDB
const User = mongoose.model('User', userSchema);

module.exports = User;