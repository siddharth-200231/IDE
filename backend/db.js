const mongoose = require('mongoose');
const connection = async () => {
    await mongoose.connect(process.env.db).then(() => {
        console.log('Connected to MongoDB');
    }).catch((error) => {
        console.log('Error connecting to MongoDB', error.message);
    });
}

module.exports = connection;