const express = require('express');
const router = express.Router();
const debug = require('debug')('account')
const mysql = require('mysql2/promise')
const klaytn = require('libkct')

/**
 * 개발되지 않은 페이지의 확인용 함수
 * @param req
 * @param res
 */
function need_build(req, res) {
  res.send('Need build function')
}

router.use((req, res, next) => {
  /**
   * 로그인 값을 app.js에서 처리하여 넘겨받아 사용.
   * id는 accesskey 값으로 password는 secretaccesskey 값으로 설정.
   * @type {{password: any, login: any}}
   */
  const auth = { login: res.locals.id, password: res.locals.password };
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = new Buffer(b64auth, 'base64').toString().split(':');

  /**
   * 입력받은 login, password가 database 값과 같은지 확인.
   */
  if (login && password && login === auth.login && password === auth.password) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
});

/**
 * account 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.get('/', function(req, res, next) {

  need_build(req, res);
});

/**
 * account 생성용 API
 */
router.get('/create', function(req, res, last_function) {

  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * account의 상세 내용 API
 */
router.get('/detail', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * account의 정보 update용 API
 */
router.get('/update', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * account의 klay 전송용 API
 */
router.get('/transfer', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * account의 수수료 대납용 klay 전송용 API
 */
router.get('/transferWithFee', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * account의 klay 전송 기록용 API
 */
router.get('/transfers', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * FT 전송용  API
 */
router.get('/transferFT/:ft', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * 수수료 대납용 FT 전송 API
 */
router.get('/transferFTWithFee/:ft', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * FT 전송 기록 확인용 API
 */
router.get('/transferFT/:ft', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * account의 balance
 */
router.get('/balance', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

/**
 * FT 잔액 확인용 API
 */
router.get('/balanceFT/:ft', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

module.exports = router;
