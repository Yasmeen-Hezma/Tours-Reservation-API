const mongoose = require('mongoose');
const Tour = require('./Tour');
const reviewSchema = mongoose.Schema({
    review: {
        type: String,
        required: [true, 'You must write a review! '],
    },
    rating: {
        type: Number,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'You must specify a tour!']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'You must specify a user!']
    },
}, {
    // virtual properties don't be saved in DB
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})
// QUERY MIDDLEWARE
reviewSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name',
    });
    next();
})
reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // (this) points to the model
    const stats = await this.aggregate([
        { $match: { tour: tourId } },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            }
        }
    ])
    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 0
        });
    }
}
// prevent duplicate reviews from same user in same tour using
reviewSchema.pre('save', async function (next) {
    const existingReview = await this.constructor.findOne({ tour: this.tour, user: this.user });
    if (existingReview) {
        next(new Error('Duplicate review for the same user and tour.', 400));
    } else {
        next();
    }
});
// use (post) to make sure that document has already saved in DB
reviewSchema.post('save', async function () {
    // (this) points to the document which is saved
    // (this.constructor) points to the model itself
    await this.constructor.calcAverageRatings(this.tour);
})
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.r = await this.clone().findOne();
    console.log(this.r);
    next();
});

reviewSchema.post(/^findOneAnd/, async function () {
    if (this.r) {
        await this.r.constructor.calcAverageRatings(this.r.tour);
    }
});


module.exports = mongoose.model('Review', reviewSchema);
