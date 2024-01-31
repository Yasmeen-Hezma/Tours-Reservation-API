const multer = require('multer');
const sharp = require('sharp');

const asyncHandler = require('express-async-handler');
const Tour = require('../models/Tour');
//const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// to save photo in memory as a buffer
const multerStorage = multer.memoryStorage();
// filter the upload to only contain images
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
};
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 },
]);
exports.resizeTourImages = asyncHandler(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();
    // 1) handle the cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);
    // 2) handle the images
    req.body.images = [];
    await Promise.all(
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`);
            req.body.images.push(filename);
        })
    );
    next();
})

exports.createTour = factory.createOne(Tour);
exports.getAllTours = factory.getAll(Tour);
exports.getOneTour = factory.getOne(Tour, { path: 'reviews' });
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
exports.getTourStats = asyncHandler(async (req, res) => {
    const stats = await Tour.aggregate([
        { $match: { ratingsAverage: { $gte: 4.5 } } },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRating: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            }
        },
        { $sort: { avgPrice: 1 } },
    ])
    res.status(200).json({
        status: 'success',
        data: {
            stats,
        }
    })
})
exports.getMonthlyPlan = asyncHandler(async (req, res) => {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([
        { $unwind: '$startDates' },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numToursStart: { $sum: 1 },
                tours: { $push: '$name' }
            }
        },
        { $addFields: { month: '$_id' } },
        { $project: { _id: 0 } },
        {
            $sort: {
                numToursStart: -1
            }
        },

    ])
    res.status(200).json({
        status: 'success',
        data: {
            plan,
        }
    })

})
exports.getToursWithin = asyncHandler(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    if (!lat || !lng) {
        return next(new AppError('Please provide latitute and longitude in the format lat,lng.', 400))
    }
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    })
    // console.log(distance, lat, lng, unit);
    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours,
        }
    })
})
exports.getDistances = asyncHandler(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    if (!lat || !lng) {
        return next(new AppError('Please provide latitute and longitude in the format lat,lng.', 400))
    }
    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
    const distances = await Tour.aggregate([{
        // must be the first one in the pipeline
        $geoNear: {
            near: {
                type: 'Point',
                coordinates: [lng * 1, lat * 1]
            },
            // the field name in the output
            distanceField: 'distance',
            distanceMultiplier: multiplier
        }
    },
    {
        // To select only these fields to appear
        $project: {
            distance: 1,
            name: 1
        }

    }])
    // console.log(distance, lat, lng, unit);
    res.status(200).json({
        status: 'success',
        data: {
            data: distances,
        }
    })
})