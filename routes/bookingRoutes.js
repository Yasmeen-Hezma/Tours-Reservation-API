const express = require('express');

const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');
const reviewController = require('../controllers/reviewController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);
router.post('/', authController.restrictTo('user'), reviewController.setTourUserIds, bookingController.checkTourAvailability, bookingController.createBooking);
router.use(authController.restrictTo('admin', 'lead-guide'));
router.delete('/:id', bookingController.deleteBooking);
router.patch('/:id', bookingController.updateBooking);
router.get('/:id', bookingController.getOneBooking);
router.get('/', bookingController.getAllBookings);
module.exports = router;
