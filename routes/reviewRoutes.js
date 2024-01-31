const express = require('express');
// to allow the nested routes with access to the params of them 
const router = express.Router({ mergeParams: true });
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
// protect all the routes after this middleware
router.use(authController.protect);
router.get('/', reviewController.getAllReviews);
router.get('/:id', reviewController.getOneReview);
router.post('/', authController.restrictTo('user'), reviewController.setTourUserIds, reviewController.checkBookingBeforeReview, reviewController.createReview);
router.delete('/:id', authController.restrictTo('user', 'admin'), reviewController.checkBookingBeforeReview, reviewController.deleteReview);
router.patch('/:id', authController.restrictTo('user', 'admin'), reviewController.checkBookingBeforeReview, reviewController.updateReview);





module.exports = router;

