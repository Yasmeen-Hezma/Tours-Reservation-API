const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.setTourUserIds = asyncHandler(async (req, res, next) => {
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    next();
})
exports.checkBookingBeforeReview = asyncHandler(async (req, res, next) => {
    const { tour, user } = req.body;

    // Check if the user has a booking for the specified tour(only for 'user')
    const booking = await Booking.findOne({ tour, user });
    if (!booking && user.role === 'user') {
        return next(new AppError('You must book the tour before writing a review.', 403));
    }
    next();
});
exports.getOneReview = factory.getOne(Review);
exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);

