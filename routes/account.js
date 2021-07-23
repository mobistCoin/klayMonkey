const express = require('express');
const router = express.Router();
const debug = require('debug')('account')
const mysql = require('mysql2/promise')
const Caver = require('caver-js')
// const caver = new Caver('http://52.195.6.63:8551/')
const caver = new Caver('https://api.baobab.klaytn.net:8651/')
const libkct = require('libkct')

const kcts = require('../libs/kcts')

/**
 * 개발되지 않은 페이지의 확인용 함수
 * @param req
 * @param res
 */
function need_build(req, res) {
    res.send('Need build function')
}

async function setAccountToInstance(instance, account) {
    instance.klay.accounts.wallet.add(account)
    return instance
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
 * 이 함수는 private Key를 포함하여 반환함.
 */
router.post('/create', async function (req, res, last_function) {
    let value = caver.klay.accounts.create()
    let connection = res.locals.connection
    sql = `Insert into account (address, publicKey, privateKey, svcID) values (?, ?, ?, ?)`
    connection.query(sql, [value.address, value.accountKey._key, value.privateKey, res.locals.svcID])
    connection.commit()
    res.send(value)
});

/**
 * account 생성용 API
 * 이 함수는 private Key를 포함하여 반환함.
 */
router.post('/createAccount', async function (req, res, last_function) {
    let value = caver.klay.accounts.create()
    let connection = res.locals.connection

    sql = `Insert into account (address, publicKey, privateKey, svcID) values (?, ?, ?, ?)`
    connection.query(sql, [value.address, value.accountKey._key, value.privateKey, res.locals.svcID])
    connection.commit()
    report = {
        "address": value.address
    }
    res.send(report)
});

/**
 * account List 내용 API
 * svc에서 해당하는 account 계정을 연계하기 위해서 사용되는 API.
 * @return
 */
router.post('/lists', async function (req, res, last_function) {
    let value = await kcts.getAccounts(res.locals.connection, req.body.svcID)
    res.send(value[0])
});

/**
 * 외부 계정을 등록하기 위한  API 함수
 * TODO: 지갑 주소의 validation, 중복 주소의 검사
 */
router.post('/register', function(req, res, last_function) {
    let connection = res.locals.connection
    /**
     * account 를 등록하기 위한 database sql 문구
     * @param address 지갑의 주소
     * @param accountkey 지갑의 공개키
     * @param privatekey 지갑의 비밀키
     * @type {string}
     */
    sql = `Insert into account (address, publicKey, privateKey) values (?, ?, ?)`

    // database 의 account 내용으로 등록할 값들을 사용하여 database 기록
    connection.query(sql, [req.body.address, req.body.accountkey, req.body.privatekey])
    // 기록한 내용을 API 값으로 반환
    res.send('{"status": True, "Address": ' + req.body.address + '}')
})

/**
 * 외부 계정을 등록해제하기 위한  API 함수
 * TODO: 지갑 주소의 validation
 */
router.post('/unregister', function(req, res, last_function) {
    let connection = res.locals.connection
    /**
     * account 를 등록하기 위한 database sql 문구
     * @param address 지갑의 주소
     * @param accountkey 지갑의 공개키
     * @param privatekey 지갑의 비밀키
     * @type {string}
     */
    sql = `DELETE FROM account WHERE address = ? AND privatekey = ?`

    // database 의 account 내용으로 등록할 값들을 사용하여 database 기록
    connection.query(sql, [req.body.address, req.body.privatekey])
    // 기록한 내용을 API 값으로 반환
    res.send('{"status": True, "Address": ' + req.body.address + '}')
})

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
 * account의 klay 전송 기록용 API
 */
router.get('/:aoa/transfers', function (req, res, last_function) {
    console.log(res.locals.config)
    need_build(req, res);
});

/**
 * account의 balance
 */
router.get('/:aoa/balance', async function (req, res, last_function) {
    let balance = await caver.rpc.klay.getBalance(req.params.aoa)
    let result = parseInt(balance)
    res.send('{"balance": ' + result + '}')
});

/**
 * FT 전송용  API (with DB)
 */
router.post('/:aoa/transferFT/:ft', async function (req, res, last_function) {
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    let contract = req.params.ft

    let privateKey = await kcts.getPrivateKeyOf(res.locals.connection, sender)

    let kip7Instance = new caver.klay.KIP7(contract)
    const account = caver.klay.accounts.createWithAccountKey(sender, privateKey)
    caver.klay.accounts.wallet.add(account)
    let reply = await kip7Instance.transfer(receiver, amount, {from: sender})
    caver.klay.accounts.wallet.remove(account.address)

    res.send(reply)
});

/**
 * fee delegation transaction 을 작성하고 RLP encoding 데이터를 반환하는 함수
 * @param senderKey 전송자의 private key
 * @param receiverAddr 토큰을 받는 지갑의 주소
 * @param amount 토큰 전송 수량
 * @returns {Promise<string>}
 * @constructor
 */
async function RLPEncodingInput(senderKey, receiverAddr,amount) {
    /**
     * keyring으로 사용자의 private key로 계정 생성.
     * @type {SingleKeyring}
     */
    const sender = caver.wallet.keyring.createFromPrivateKey(senderKey)
    /**
     * 생성된 계정을 in-memory wallet 에 keyring 추가
     */
    caver.wallet.add(sender)

    /**
     * 전송하고자 하는 transaction 을 만들고 feeDelegatedValueTransfer 로 생성
     * @type {FeeDelegatedValueTransfer}
     */
    const feeDelegatedTx = caver.transaction.feeDelegatedValueTransfer.create({
        from: sender.address,
        to: receiverAddr,
        value: amount,
        gas: 50000,
    })

    /**
     * 전송자의 계정으로 sign을 한다.
     */
    await caver.wallet.sign(sender.address, feeDelegatedTx)

    /**
     * 사용이 끝난 keyring 의 제거
     */
    caver.wallet.remove(sender.address)

    /**
     * 만들어진 transaction의 RLP encoding 데이터를 반환
     */
    return feeDelegatedTx.getRLPEncoding()
}

/**
 * 수수료 대납용 API
 */
router.post('/:aoa/transferWithFee', async function (req, res, last_function) {
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    let feePayerKey = res.locals.config.klaytn.feePayerKey

    /**
     * 전송 지갑의 private key 를 Database에서 가져옴.
     * @type {*}
     */
    let privateKey = await kcts.getPrivateKeyOf(res.locals.connection, sender)
    console.log(privateKey)

    /**
     * transaction encoding 데이터를 만든다.
     * @type {string}
     */
    const rlpEncodedStr = await RLPEncodingInput(privateKey, receiver, amount)
    /**
     * rlp 인코딩 데이터를 수수료 대납 전소용 transaction 으로 만든다.
     * @type {FeeDelegatedValueTransfer}
     */
    const feeDelegateTx = caver.transaction.feeDelegatedValueTransfer.create(rlpEncodedStr)

    /**
     * 수수료 대납 지갑의 private key 를 이용하여 수수료 대납용 keyrig 생성.
     * @type {SingleKeyring}
     */
    const feePayer = caver.wallet.keyring.createFromPrivateKey(feePayerKey)
    /**
     * 지갑의 in-memory wallet 에 키링 추가
    */
    caver.wallet.add(feePayer)

    /**
     * 수수료 대납용 transaction 코드의 비어있는 수수료 대납 계정 정보를 추가
     * @type {string}
     */
    feeDelegateTx.feePayer = feePayer.address
    /**
     * 수수료 대납용 transaction 코드의 sign 하여 실행시킴.
     */
    await caver.wallet.signAsFeePayer(feePayer.address, feeDelegateTx)

    /**
     * 사용이 끝난 keyring 의 제거
     */
    caver.wallet.remove(feePayer.address)

    res.send(feeDelegateTx)
});

/**
 * fee delegation transaction 을 작성하고 RLP encoding 데이터를 반환하는 함수
 * @param senderKey
 * @param receiver
 * @param contractAddr
 * @param amount
 * @returns {Promise<string>}
 * @constructor
 */
async function RLPEncodingInputWithFee(senderKey, receiver, contractAddr, amount) {
    /**
     * keyring으로 사용자의 private key로 계정 생성.
     * @type {SingleKeyring}
     */
    const sender = caver.wallet.keyring.createFromPrivateKey(senderKey)
    /**
     * 생성된 계정을 in-memory wallet 에 keyring 추가
     */
    caver.wallet.add(sender)

    /**
     * smart contract에서 실행할 input byte code 를 작성
     * @type {string}
     */
    let functionABI = kcts.transferByteInput(receiver, Number(amount).toString(16))

    /**
     * 전송하고자 하는 transaction 을 만들고 feeDelegatedSmartContractExecution 로 생성
     * @type {FeeDelegatedValueTransfer}
     */
    const feeDelegatedTx = caver.transaction.feeDelegatedSmartContractExecution.create({
        from: sender.address,
        to: contractAddr,
        input: functionABI,
        gas: 90000,
    })

    /**
     * wallet 에 추가된 sender 의 keyring 으로 transaction 에 sign
     */
    await caver.wallet.sign(sender.address, feeDelegatedTx)

    /**
     * 사용이 끝난 keyring 의 제거
     */
    caver.wallet.remove(sender.address)

    /**
     * sign 된 transaction 의 RLP encoding 데이터를 반환
     */
    return feeDelegatedTx.getRLPEncoding()
}

/**
 * 수수료 대납용 FT 전송 API
 */
router.post('/:aoa/transferFTWithFee/', async function (req, res, last_function) {
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    let feePayerKey = res.locals.config.klaytn.feePayerKey
    let contract = res.locals.config.klaytn.contract

    /**
     * 전송 지갑의 private key 를 Database에서 가져옴.
     * @type {*}
     */
    let privateKey = await kcts.getPrivateKeyOf(res.locals.connection, sender)

    /**
     * transaction encoding 데이터를 만든다.
     * @type {string}
     */
    const rlpEncodedStr = await RLPEncodingInputWithFee(privateKey, receiver, contract, amount)
    /**
     * rlp 인코딩 데이터를 수수료 대납 전소용 transaction 으로 만든다.
     * @type {FeeDelegatedValueTransfer}
     */
    const feeDelegateTx = caver.transaction.feeDelegatedSmartContractExecution.create(rlpEncodedStr)

    /**
     * 수수료 대납 지갑의 private key 를 이용하여 수수료 대납용 keyrig 생성.
     * @type {SingleKeyring}
     */
    const feePayer = caver.wallet.keyring.createFromPrivateKey(feePayerKey)
    /**
     * 지갑의 in-memory wallet 에 키링 추가
     */
    caver.wallet.add(feePayer)

    /**
     * 수수료 대납용 transaction 코드의 비어있는 수수료 대납 계정 정보를 추가
     * @type {string}
     */
    feeDelegateTx.feePayer = feePayer.address
    /**
     * 수수료 대납용 transaction 코드의 sign 하여 실행시킴.
     */
    feeDelegateTxSigned = await caver.wallet.signAsFeePayer(feePayer.address, feeDelegateTx)

    /**
     * 만들어진 transaction 데이터를 sendRawTransaction 으로 실제 klaytn 으로 전송
     */
    caver.rpc.klay.sendRawTransaction(feeDelegateTxSigned)

    /**
     * 사용이 끝난 keyring 의 제거
     */
    caver.wallet.remove(feePayer.address)

    res.send(feeDelegateTx)
});

/**
 * 수수료 대납용 FT 전송 API
 */
router.post('/:feepayer/transferFTWithFee/:aoa', async function (req, res, last_function) {
    let sender = req.params.aoa
    let receiver = req.body.receiver
    let amount = req.body.amount
    let feePayerKey = req.params.feePayer
    let contract = res.locals.config.klaytn.contract

    /**
     * 전송 지갑의 private key 를 Database에서 가져옴.
     * @type {*}
     */
    let privateKey = await kcts.getPrivateKeyOf(res.locals.connection, sender)

    /**
     * transaction encoding 데이터를 만든다.
     * @type {string}
     */
    const rlpEncodedStr = await RLPEncodingInputWithFee(privateKey, receiver, contract, amount)
    /**
     * rlp 인코딩 데이터를 수수료 대납 전소용 transaction 으로 만든다.
     * @type {FeeDelegatedValueTransfer}
     */
    const feeDelegateTx = caver.transaction.feeDelegatedSmartContractExecution.create(rlpEncodedStr)

    /**
     * 수수료 대납 지갑의 private key 를 이용하여 수수료 대납용 keyrig 생성.
     * @type {SingleKeyring}
     */
    const feePayer = caver.wallet.keyring.createFromPrivateKey(feePayerKey)
    /**
     * 지갑의 in-memory wallet 에 키링 추가
     */
    caver.wallet.add(feePayer)

    /**
     * 수수료 대납용 transaction 코드의 비어있는 수수료 대납 계정 정보를 추가
     * @type {string}
     */
    feeDelegateTx.feePayer = feePayer.address
    /**
     * 수수료 대납용 transaction 코드의 sign 하여 실행시킴.
     */
    feeDelegateTxSigned = await caver.wallet.signAsFeePayer(feePayer.address, feeDelegateTx)

    /**
     * 만들어진 transaction 데이터를 sendRawTransaction 으로 실제 klaytn 으로 전송
     */
    caver.rpc.klay.sendRawTransaction(feeDelegateTxSigned)

    /**
     * 사용이 끝난 keyring 의 제거
     */
    caver.wallet.remove(feePayer.address)

    res.send(feeDelegateTx)
});

/**
 * FT 전송 기록 확인용 API
 */
router.get('/:aoa/transferFT', async function (req, res, last_function) {
    let transfers = await libkct.AccountTransfers(req.params.aoa)
    res.send(transfers)
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
    let values = await kcts.getBalancesOfFT(res.locals.connection, req.params.aoa, req.params.ft)
    res.send(values[0][0])
});

module.exports = router;
