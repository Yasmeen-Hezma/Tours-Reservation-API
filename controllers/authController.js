const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const AppError = require('../utils/appError');
const User = require('../models/User');
const Email = require('../utils/email');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};
const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
    }
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    // to remove password from output
    user.password = undefined;
    res.cookie('jwt', token, cookieOptions);
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
}
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    // 1) check if email & password exist
    if (!email || !password)
        return next(new AppError('please enter your email and password!', 400));
    // 2) check if the email and password are valid
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password)))
        return next(new AppError('email or password is invalid', 401));
    // 3) Check if the email is verified
    if (!user.emailVerified) {
        return next(new AppError('Email is not verified. Please check your email for verification instructions.', 401));
    }
    // 4) if everything is ok, send token to the client
    createSendToken(user, 200, res);
})
exports.signup = asyncHandler(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role,
    });

    // Generate an email verification token
    const emailVerificationToken = newUser.generateEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    // Send verification email
    const verificationURL = `${req.protocol}://${req.get('host')}/api/v1/users/verifyEmail/${emailVerificationToken}`;
    try {
        await new Email(newUser, verificationURL).sendEmailVerification();
        res.status(201).json({
            status: 'success',
            message: 'User created. Verification email sent.',
        });
    } catch (err) {
        console.log(err);
        return next(new AppError('There was an error sending the verification email. Try again later!'), 500);
    }
});
exports.protect = asyncHandler(async (req, res, next) => {
    // 1) check if there's a token
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }
    // 2) verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log(decoded);
    // 3) check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user for that token does not exist', 401));
    }
    // 4) check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat))
        return next(new AppError('The user has changed password, please login again!', 401));

    req.user = currentUser;
    next();
})
/* we can't pass arguments to a middleware so we create a wrapper function to pass the arguments and return
the middleware*/
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // roles is an array
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};
exports.forgetPassword = asyncHandler(async (req, res, next) => {
    // 1) get user by its email
    const user = await User.findOne({ email: req.body.email });
    if (!user)
        return next(new AppError('there is no user with this email.', 404));
    // 2) generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    // 3) send it to the user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    try {
        await new Email(user, resetURL).sendPasswordReset();
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email',
        });
    }
    catch (err) {
        console.log(err);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError('There was an error sending the email. Try again later!'),
            500
        );
    }
})
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // 1) get user based on token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });
    // 2) if token hasn't expired, and there is a user, set the new password
    if (!user)
        return next(new AppError('token is invalid or has expired', 400));
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // we use save not findOneAndUpdate to apply both the validators & middlewares
    await user.save();
    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);

})
exports.updatePassword = asyncHandler(async (req, res, next) => {
    // 1) get the user
    const user = await User.findById(req.user.id).select('+password');
    // 2) check if current password is correct
    if (!await (user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong!'),
            401
        );
    }
    // 3) if so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // 4) log user in , send JWT
    createSendToken(user, 200, res);
})
exports.logout = asyncHandler(async (req, res, next) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
});
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() },
    });

    // 2) If token is invalid or has expired
    if (!user) {
        return next(new AppError('Email verification token is invalid or has expired.', 400));
    }

    // 3) Update user's emailVerified status
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: 'success',
        message: 'Email verified. You can now log in.',
    });
});

