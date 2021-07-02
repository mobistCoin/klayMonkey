const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs')

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/account');
const contractRouter = require('./routes/contract');
const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

logstream = fs.createWriteStream('app.log', {'flags': 'w'})

app.use(logger({'stream': logstream, 'format': 'dev'}));

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 설정 파일 내용을 jsonData로 저장.
 * @type {string}
 */
const jsonData = JSON.parse(fs.readFileSync('./platform.json', 'utf8'));

app.use(function (req, res, next) {
    /**
     * JSON 파일의 내용을 읽고 내용을 router에 전송
     * @type {any}
     */
    res.locals.config = jsonData

    next();
})

app.use('/', indexRouter);
app.use('/account', usersRouter);
app.use('/contract', contractRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
