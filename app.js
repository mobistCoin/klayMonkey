const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const fs = require('fs')
const mysql = require('mysql2/promise')
const debug = require('debug')('app')

const indexRouter = require('./routes/index')
const usersRouter = require('./routes/account')
const contractRouter = require('./routes/contract')
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
 * 설정 파일의 내용을 json Data로 변환.
 * @type {any}
 */
const jsonData = JSON.parse(fs.readFileSync('./platform.json', 'utf8'))

/* Database connection setting */
const {database, dbTable, dbUser, dbPass, svcID} = jsonData.database;

async function getSVC(svc_id) {
    const connection1 = await mysql.createConnection({
        host: 'localhost',
        user: dbUser,
        password: dbPass,
        database: database
    });

    sql = 'SELECT * FROM svc where pid=' + svc_id

    let value = await connection1.query(sql)

    return value
}

app.use( async function (req, res, next) {
    const dbValue = await getSVC(jsonData.database.svcID)

    console.log(dbValue[0][0].accesskey)

    /**
     * JSON 파일의 내용을 읽고 내용을 router에 전송
     * @type {any}
     */
    res.locals.config = jsonData
    res.locals.id = dbValue[0][0].accesskey
    res.locals.password = dbValue[0][0].secretaccesskey

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
