const express = require('express');
const router = express.Router();
const debug = require('debug')('account')
const mysql = require('mysql2/promise')
const klaytn = require('libkct')
const Caver = require('caver-js')
// const caver = new Caver('http://52.195.6.63:8551/')
const caver = new Caver('https://api.baobab.klaytn.net:8651/')

/**
 * 개발되지 않은 페이지의 확인용 함수
 * @param req
 * @param res
 */
function need_build(req, res) {
    res.send('Need build function')
}

async function getAccounts(connection) {
    /**
     * svc_id에 매칭되는 id와 password를 가져옴.
     * @type {string}
     */
    sql = 'SELECT * FROM account'

    /**
     * mysql2에서는 query 데이터를 await로 가져와서 처리함.
     * @type {*}
     */
    let value = await connection.query(sql)
    console.log(value)

    /**
     * database 값을 반환.
     */
    return value
}

async function getPrivateKeyOf(connection, address) {
    /**
     * svc_id에 매칭되는 id와 password를 가져옴.
     * @type {string}
     */
    let sql = 'SELECT * FROM account where address="' + address + '"'

    /**
     * mysql2에서는 query 데이터를 await로 가져와서 처리함.
     * @type {*}
     */
    let value = await connection.query(sql)

    /**
     * database 값을 반환.
     */
    return value[0][0].privatekey
}

async function setAccountToInstance(instance, account) {
    instance.klay.accounts.wallet.add(account)
    return instance
}

async function getBalancesOfFT(connection, address, ft) {
    /**
     * svc_id에 매칭되는 id와 password를 가져옴.
     * @type {string}
     */
    sql = 'SELECT * FROM balance where address="' + address + '" and ft ="' + ft + '"'

    debug(sql)

    /**
     * mysql2에서는 query 데이터를 await로 가져와서 처리함.
     * @type {*}
     */
    let value = await connection.query(sql)

    /**
     * database 값을 반환.
     */
    return value
}

router.use((req, res, next) => {
    /**
     * 로그인 값을 app.js에서 처리하여 넘겨받아 사용.
     * id는 accesskey 값으로 password는 secretaccesskey 값으로 설정.
     * @type {{password: any, login: any}}
     */
    const auth = {login: res.locals.id, password: res.locals.password};
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
router.get('/', function (req, res, next) {
    console.log(typeof res)
    need_build(req, res);
});

/**
 * account 생성용 API
 */
router.get('/create', async function (req, res, last_function) {
    let value = caver.klay.accounts.create()
    let connection = res.locals.connection
    sql = `Insert into account (address, accountkey, privatekey) values (?, ?, ?)`
    connection.query(sql, [value.address, value.accountKey._key, value.privateKey])
    res.send(value)
});

/**
 * account의 상세 내용 API
 */
router.get('/detail', function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});

/**
 * account List 내용 API
 * @return
 */
router.get('/lists', async function (req, res, last_function) {
    let value = await getAccounts(res.locals.connection)
    res.send(value[0])
});

/**
 * account의 정보 update용 API
 */
router.get('/update', function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});

/**
 * account의 klay 전송용 API
 */
router.get('/:aoa/transfer', function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});

/**
 * account의 수수료 대납용 klay 전송용 API
 */
router.post('/:aoa/transferWithFee', async function (req, res, last_function) {
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    let feePayer = res.locals.config.klaytn.feePayer
    let feePayerKey = res.locals.config.klaytn.feePayerKey

    let privateKey = await getPrivateKeyOf(res.locals.connection, sender)

    const account = caver.klay.accounts.createWithAccountKey(sender, privateKey)
    caver.klay.accounts.wallet.add(account)

    const vt = {
        type: 'FEE_DELEGATED_VALUE_TRANSFER',
        from: account.address,
        to: receiver,
        value: amount,
        gas: 50000,
    }
    const { rawTransaction } = await caver.klay.accounts.signTransaction(vt)
    debug(rawTransaction)
    debug(feePayer)
    debug(feePayerKey)

    const feePayerId = caver.klay.accounts.createWithAccountKey(feePayer, feePayerKey)
    caver.klay.accounts.wallet.add(feePayerId)

    const signed = await caver.klay.accounts.feePayerSignTransaction(rawTransaction, feePayerId.address)
    console.log(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }), `Signed TX : ${JSON.stringify(signed)}\n`)

    const transactionReceipt = await caver.klay.sendSignedTransaction(signed)
    console.log(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }), `Daemon RESPONSE: ${JSON.stringify(transactionReceipt)}\n`)

    res.send(transactionReceipt)
});

/**
 * account의 klay 전송 기록용 API
 */
router.get('/:aoa/transfers', function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});

/**
 * account의 balance
 */
router.get('/:aoa/balance', function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});


/**
 * FT 전송용  API (with DB)
 */
router.post('/:aoa/transferFT/:ft', async function (req, res, last_function) {
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    let contract = req.params.ft

    let privateKey = await getPrivateKeyOf(res.locals.connection, sender)

    let kip7Instance = new caver.klay.KIP7(contract)
    const account = caver.klay.accounts.createWithAccountKey(sender, privateKey)
    caver.klay.accounts.wallet.add(account)
    let reply = await kip7Instance.transfer(receiver, amount, {from: sender})
    caver.klay.accounts.wallet.remove(account.address)

    res.send(reply)
});

/**
 * 수수료 대납용 FT 전송 API
 */
router.post('/:aoa/transferFTWithFee/:ft', async function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});

/**
 * FT 전송 기록 확인용 API
 */
router.get('/:aoa/transferFT/:ft', function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});

/**
 * FT 잔액 확인용 API (from DB)
 * @return
    {
    "address": "0x(account address)",
    "ft": "0x(ft address)",
    "values": "0.000000000000000000",
    "staking": "0.000000000000000000"
  }
 */
router.post('/:aoa/balanceFT/:ft', async function (req, res, last_function) {
    let values = await getBalancesOfFT(res.locals.connection, req.params.aoa, req.params.ft)
    res.send(values[0][0])
});

module.exports = router;
