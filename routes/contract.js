const express = require('express');
const router = express.Router();


router.get('/', function(req, res, next) {
  console.log(res.locals.config)
  res.send('respond with a resource');
});

module.exports = router;
