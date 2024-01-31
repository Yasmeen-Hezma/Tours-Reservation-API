const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const connectDB = async () => {
    try {
        const db = await mongoose.connect(process.env.DATABASE);
        console.log('DB is connected');
    } catch (error) {
        console.log(error);
    }
}
module.exports = connectDB;