const multer = require('multer');
const sharp = require('sharp');

const asyncHandeler = require('express-async-handler');
const User = require('../models/User');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
// to create image upload middleware
// to save photo in memory as a buffer
const multerStorage = multer.memoryStorage();
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

exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = asyncHandeler(async (req, res, next) => {
    if (!req.file) return next();
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`);
    next();
})
const filterObj = (obj, ...wantedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (wantedFields.includes(el)) newObj[el] = obj[el];
    })
    return newObj;
}
exports.updateMe = asyncHandeler(async (req, res, next) => {
    // 1) create error if user POSTs a password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for password updates. Please use /updateMyPassword.', 400))
    }
    // 2) filter the fields
    const filteredBody = filterObj(req.body, 'name', 'email');
    if (req.file) filteredBody.photo = req.file.filename;
    // console.log(req);
    // 3) update the user
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });
    res.status(200).json({
        status: 'success',
        data: updatedUser,
    })
})
exports.deleteMe = asyncHandeler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });
    res.status(204).json({
        status: 'success',
        data: null,
    })
})
exports.getMe = asyncHandeler(async (req, res, next) => {
    req.params.id = req.user.id;
    next();
})
exports.getAllUsers = factory.getAll(User);
exports.getOneUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
// not the password
exports.updateUser = factory.updateOne(User);

