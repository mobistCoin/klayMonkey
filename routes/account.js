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

/**
 * Database 계좌 정보를 읽어와서 전체 내용을 json으로 반환
 * @param connection
 * @returns {Promise<*>}
 */
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

/**
 * Database 에서 Private Key 읽어오기
 * @param connection Database 연결
 * @param address Private key 를 읽가져오려는 지갑 주소
 * @returns {Promise<*>} Private Key
 */
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

/**
 * 인코딩된 Smart Contract Data 생성용 함수
 * @param address 토큰 전송 대상 주소
 * @param amount 토큰 전송 수량
 * @returns {string} 인코딩된 데이터
 */
function transferByteInput(address, amount) {
    /**
     * transfer 함수의 bytecode
     * @type {string}
     */
    const funcName = "0xa9059cbb"
    /**
     * Token 전송 대상이 되는 지갑 주소
     * @type {string} 64 byte 길이의 문자열
     */
    let toAddr = address.substr(2).padStart(64, '0')
    /**
     * 전송되는 token 수량을 지정
     * @type {string} 64 byte 길이의 문자열
     */
    let toAmount = amount.padStart(64, '0')

    /**
     * 만들어진 string 들을 전부 합하여 결과값으로 반환
     */
    return funcName + toAddr + toAmount
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
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    let feePayer = res.locals.config.klaytn.feePayer
    let feePayerKey = res.locals.config.klaytn.feePayerKey
    let contract = res.locals.config.klaytn.contract

    let privateKey = await getPrivateKeyOf(res.locals.connection, sender)

    const account = caver.klay.accounts.createWithAccountKey(sender, privateKey)
    caver.klay.accounts.wallet.add(account)

    let functionABI = transferByteInput(receiver, Number(amount).toString(16))
    debug(functionABI)

    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction(
        {
            type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
            from: account.address,
            to: contract,
            gas: '300000',
            value: caver.utils.toPeb('0', 'KLAY'),
            data: functionABI,
        },
        privateKey
    )

    debug(senderRawTransaction)
    debug(feePayer)
    debug(feePayerKey)

    const feePayerId = caver.klay.accounts.wallet.add(feePayerKey)

    const receipt = await caver.klay.sendTransaction({
        senderRawTransaction: senderRawTransaction,
        feePayer: feePayerId.address,
    })

    res.send(receipt)
});

async function RLPEncodingInput(senderKey, receiverAddr,amount) {
    const sender = caver.wallet.keyring.createFromPrivateKey(senderKey)
    caver.wallet.add(sender)

    const feeDelegatedTx = caver.transaction.feeDelegatedValueTransfer.create({
        from: sender.address,
        to: receiverAddr,
        value: amount,
        gas: 50000,
    })

    await caver.wallet.sign(sender.address, feeDelegatedTx)

    return feeDelegatedTx.getRLPEncoding()
}

router.post('/:aoa/transferFTWithFeev2/:ft', async function (req, res, last_function) {
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    //let feePayer = res.locals.config.klaytn.feePayer
    let feePayerKey = res.locals.config.klaytn.feePayerKey
    let contract = res.locals.config.klaytn.contract

    let privateKey = await getPrivateKeyOf(res.locals.connection, sender)

    const account = caver.wallet.keyring.createFromPrivateKey(privateKey)

    const rlpEncodedStr = await RLPEncodingInput(account.address, receiver, amount)
    const feeDelegateTx = caver.transaction.feeDelegatedValueTransfer.create(rlpEncodedStr)

    feeDelegateTx.feePayer = feePayer.address
    await caver.wallet.signAsFeePayer(feePayer.address, feeDelegateTx)

    res.send(feeDelegateTx.getRLPEncoding())
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
