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
 * contract 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.get('/', function(req, res, next) {
  console.log(res.locals.config)
  console.log(res.locals.connection)
  res.send('respond with a resource');
});

/**
 * contract 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.get('/:ft', function(req, res, next) {
  console.log(res.locals.config)
  res.send('respond with a resource');
});

router.get('/:ft/holders', function(req, res, next) {
  console.log(res.locals.config)
  res.send('respond with a resource');
});

router.get('/:ft/', function(req, res, next) {
  console.log(res.locals.config)
  res.send('respond with a resource');
});

module.exports = router;
