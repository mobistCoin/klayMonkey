const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('./libs/log_winston')
const morgan = require('morgan')
const fs = require('fs')
const mysql = require('mysql2/promise')

// const nodemailer = require('nodemailer')

// API routing 설정
const indexRouter = require('./routes/index')
const usersRouter = require('./routes/account')
const contractRouter = require('./routes/contract')
const mailRouter = require('./routes/mailer')

// Debug 메시지 설정
const combined = ':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
const morganFormat = process.env.NODE_ENV !== "production" ? "dev" : combined;

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(morgan(morganFormat, {stream : logger.stream}))

/**
 * 설정 파일의 내용을 json Data 로 변환.
 * @type {any}
 */
const jsonData = JSON.parse(fs.readFileSync('./platform.json', 'utf8'))

// database 연결 설정값을 json 파일에서 읽어오기.
const {database, dbUser, dbPass} = jsonData.database;

// mysql Database 연결 작성
const connection_db = mysql.createConnection({
    host: 'localhost',
    user: dbUser,
    password: dbPass,
    database: database
});

/**
 * DB 연결 및 query 값 확인.
 * mysql2 사용으로 await 사용
 * svc table 에서 svc_id를 바탕으로 id, pass 가져옴.
 * @param svc_id
 * @returns {Promise<*>}
 */
async function getSVC(svc_id) {
    let connection = await connection_db
    /**
     * svc_id에 매칭되는 id와 password 를 가져옴.
     * @type {string}
     */
    sql = 'SELECT * FROM svc where pid=' + svc_id
    logger.debug(sql)

    /**
     * mysql2에서는 query 데이터를 await 처리하여 반환
     * @type {*}
     */
    return await connection.query(sql)
}

/**
 * API 인증을 위해 SVC 의 ID와 PASSWORD 를 확인한다.
 * SVC 에게 할당된 ID와 PASSWORD 를 확인하여
 * SVC 는 API 를 사용할 수 있는 권한을 얻을 수 있다.
 *
 * 참조하는 값
 * json_body = {
 *      "svcID": "svc ID",
 *      "netID": 8217
 * }
 */
app.use( async function (req, res, next) {
    /**
     * database 에서 data 를 가져온다.
     * @type {*}
     */
    try{
        /**
         * Database 저장소에서 svc id 키를 사용하여
         * id, password 값을 가져오는 부분.
         * svcID를 잘못 입력하여 dbValue 값이 비어있는 경우
         * exception 이 발생하여 "auth fail" 발생.
         * @type {*}
         */
        const dbValue = await getSVC(req.body.svcID)
        res.locals.connection = await connection_db

        /**
         * JSON 파일의 내용을 읽고 내용을 router 에 전송
         * @type {any}
         */
        res.locals.config = jsonData
        // 전달받은 body 값에 있는 svcID 값을 locals 변수 값으로 채워 넣옴.
        res.locals.svcID = req.body.svcID
        // 전달받은 body 값에 있는 type 값을 locals 변수 값으로 채워 넣옴.
        res.locals.type = req.body.type

        /**
         * 메인넷 사용 여부 전환
         * @type {number} 설정한 network id를 변수에 설정.
         */
        res.locals.netID = req.body.netID
        logger.debug(req.body.netID)

        // 접속용 id 값을 database 값으로 설정
        res.locals.id = dbValue[0][0].accesskey
        // 접속용 password 를 database 값으로 설정
        res.locals.password = dbValue[0][0].secretaccesskey

        next();
    }
    catch (exception) {console.log(exception.s)
        logger.debug('main 인증 실패.')
        return res.send('{"status": "auth fail"}')
    }

})

// API routing 등록 진행.
app.use('/', indexRouter);
app.use('/account', usersRouter);
app.use('/contract', contractRouter);
app.use('/mailer', mailRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    logger.info('Error route')
    next(createError(404));
});

// error handler
app.use(function (err, req, res) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// app 설정하는 부분.
module.exports = app;
