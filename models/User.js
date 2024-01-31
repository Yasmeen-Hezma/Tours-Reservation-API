const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'please enter your name!'],
    },
    email: {
        type: String,
        required: [true, 'please enter your email!'],
        unique: true,
        lowercase: true, // convert all the uppercase letters to lowercase
        validate: [validator.isEmail, 'please enter a valid email !'],
    },
    photo: {
        type: String,
        default: 'default.jpg'

    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'please enter a password!'],
        minlength: 8,
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // this only works on create & save
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords are not the same!',
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
})
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
})
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    // to make sure the token is always created, after the password has been changed (-1sec)
    this.passwordChangedAt = Date.now() - 1000;
    next();
})
userSchema.pre(/^find/, function (next) {
    // this points to the current query
    this.find({ active: { $ne: false } });
    next();
});
userSchema.methods.correctPassword = async function (bodyPassword, userPassword) {
    return await bcrypt.compare(bodyPassword, userPassword);
}
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTime = parseInt(this.passwordChangedAt / 1000, 10);
        return JWTTimestamp < changedTime;
    }
    // false means not changed
    return false;
}
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    // the hash token that will be saved to DB
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    // time for reset password expires in 10 minutes
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
}
userSchema.methods.generateEmailVerificationToken = function () {
    const verifyToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
    this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
    return verifyToken;
}
module.exports = mongoose.model('User', userSchema);
