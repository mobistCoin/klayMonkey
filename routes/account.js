const express = require('express');
const router = express.Router();

/**
 * 개발되지 않은 페이지의 확인용 함수
 * @param req
 * @param res
 */
function need_build(req, res) {
  res.send('Need build function')
}

/**
 * account 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.get('/', function(req, res, next) {
  console.log(res.locals.config)
  need_build('respond with a resource');
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

router.get('/transferFT', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

router.get('/transferFTWithFee', function(req, res, last_function) {
  console.log(res.locals.config)
  need_build(req, res);
});

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
