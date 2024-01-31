const mongoose = require('mongoose');
const { default: slugify } = require('slugify');
const tourSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must has a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must have less or equal then 40 characters'],
        minlength: [10, 'A tour name must have more or equal then 10 characters']
    },
    slug: String,
    price: {
        type: Number,
        required: [true, 'A tour must has a name'],
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (val) {
                // this only points to current doc when create() not update()
                return val < this.price;
            },
            message: 'Discount ({VALUE}) should be less than the original price',
        }
    },

    duration: {
        type: Number,
        required: [true, 'A tour must has a duration'],
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must has a duration'],
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must has a difficulty'],
        enum: {
            values: ['easy', 'medium', 'hard'],
            message: 'Difficulty is either: easy, medium, hard'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0'],
        set: val => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A tour must has a summary'],
    },
    description: {
        type: String,
        trim: true,
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must has an image'],
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false,
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false,
    }, startLocation: {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
    },
    locations: [{
        type: {
            type: String,
            default: 'Point',
            enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
    }],
    guides: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
    }],
    bookings: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
        },],
    bookedSeats: {
        type: Number,
        default: 0,
    },
}
    , {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    })
// use the indexes to improve read performance
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
// virtual properties don't be saved in DB
// used regular function, not an arrow, because we want 'this'
tourSchema.virtual('durationWeeks').get(function () {
    // this points to the document 
    return this.duration / 7;
})
// virtual populate (instead of having child referencing)
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
})
// DOCUMENT MIDDLEWARE : runs before .save() and .create()
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
})
// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true } });
    next();
})
tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });
    next();
})


module.exports = mongoose.model('Tour', tourSchema);