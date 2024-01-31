const path = require('path');
const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
dotenv.config();
const app = express();
const db = require('./utils/db');
const globalErrorHandler = require('./controllers/errorController');

// setting up 
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
// Global middleware
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));
// 1) Set security HTTP headers
app.use(helmet());
// 2) development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
// 3) limit requests from same IP
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!',
})
app.use('/api', limiter);
// 4) Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
// 5) Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// 6) Data sanitization against XSS (malicious html)
app.use(xss());
// 7) Prevent parameter pollution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price'
        ]
    })
);
db();

const port = process.env.PORT;
app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
})

app.use('/api/v1/tours/', require('./routes/tourRoutes'));
app.use('/api/v1/users/', require('./routes/userRoutes'));
app.use('/api/v1/reviews/', require('./routes/reviewRoutes'));
app.use('/api/v1/bookings/', require('./routes/bookingRoutes'));



app.use(globalErrorHandler);
module.exports = app;