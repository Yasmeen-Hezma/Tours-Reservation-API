const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const factory = require('./handlerFactory');
const Tour = require('../models/Tour');
const AppError = require('../utils/appError');

exports.checkTourAvailability = asyncHandler(async (req, res, next) => {
    const { tour, participants } = req.body;
    const tourAvailability = await Tour.findById(tour);
    if (!tourAvailability || tourAvailability.maxGroupSize - tourAvailability.bookedSeats < participants) {
        return next(new AppError('Not enough available seats for this booking.', 400));
    }
    next();
});


exports.createBooking = factory.createOne(Booking);
exports.getOneBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

