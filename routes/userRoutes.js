const express = require('express');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.patch('/verifyEmail/:token', authController.verifyEmail);
router.post('/forgetPassword', authController.forgetPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
// protect all the routes after this middleware
router.use(authController.protect);
router.patch('/updateMyPassword', authController.updatePassword);
router.patch('/updateMe', userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
router.get('/me', userController.getMe, userController.getOneUser);
// retrict all the routes to (admin) only
router.use(authController.restrictTo('admin'));
router.delete('/:id', userController.deleteUser);
router.patch('/:id', userController.updateUser);
router.get('/:id', userController.getOneUser);
router.get('/', userController.getAllUsers);






module.exports = router;