const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');
const bookingRouter = require('./bookingRoutes');

// nested routes
router.use('/:tourId/reviews', reviewRouter);
router.use('/:tourId/bookings', bookingRouter);

router.get('/', tourController.getAllTours);
router.get('/tour-stats', tourController.getTourStats);
router.get('/:id', tourController.getOneTour);
router.get('/tours-within/:distance/center/:latlng/unit/:unit', tourController.getToursWithin);
router.get('/distances/:latlng/unit/:unit', tourController.getDistances);

// protect all the routes after this middleware
router.use(authController.protect);
// retrict all the routes to (admin/lead-guide) only
router.use(authController.restrictTo('admin', 'lead-guide'));
router.post('/', tourController.createTour);
router.patch('/:id', tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour);
router.delete('/:id', tourController.deleteTour);
//router.use(authController.restrictTo('admin', 'lead-guide'));

router.use(authController.restrictTo('admin', 'lead-guide', 'guide'));
router.get('/month-plan/:year', tourController.getMonthlyPlan);





module.exports = router;