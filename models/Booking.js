const mongoose = require('mongoose');
const Tour = require('./Tour');
const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Booking must belong to a user'],
    },
    tour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour',
        required: [true, 'Booking must belong to a tour'],
    },
    participants: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending',
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },
});
// prevent duplicate bookings from same user in same tour using
bookingSchema.pre('save', async function (next) {
    const existingBooking = await this.constructor.findOne({ tour: this.tour, user: this.user });
    if (existingBooking) {
        next(new Error('Duplicate booking for the same user and tour.', 400));
    } else {
        next();
    }
});
// update the (bookedSeats) with every new booking
bookingSchema.pre('save', async function (next) {
    const tourId = this.tour;
    await Tour.findByIdAndUpdate(tourId, {
        $inc: { bookedSeats: this.participants },
    });

    next();
});
module.exports = mongoose.model('Booking', bookingSchema);

