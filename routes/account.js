const express = require('express');
const router = express.Router();
const debug = require('debug')('account')
const mysql = require('mysql2/promise')
const Caver = require('caver-js')
const lib_kct = require('libkct')
const db_works = require('../libs/db_works')
const setting = require('../libs/variable')

/**
 * 개발되지 않은 페이지의 확인용 함수
 * @param req
 * @param res
 */
function need_build(req, res) {
    res.send('Need build function')
}

function get_caver(netID) {
    let caver

    if (netID === 8217) {
        caver = new Caver('http://52.195.6.63:8551/')
    } else {
        caver = new Caver('https://api.baobab.klaytn.net:8651/')
    }

    return caver
}

async function setAccountToInstance(instance, account) {
    instance.klay.accounts.wallet.add(account)
    return instance
}

/**
 * fee delegation transaction 을 작성하고 RLP encoding 데이터를 반환하는 함수
 * @param senderKey - 전송자의 private key
 * @param receiverAddr - 토큰을 받는 지갑의 주소
 * @param amount - 토큰 전송 수량
 * @returns {Promise<string>}
 * @constructor
 */
async function RLPEncodingInput(senderKey, receiverAddr, amount) {
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
    let functionABI = db_works.transferByteInput(receiver, Number(amount).toString(16))

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
 * 로그인처리용 middleware 구조
 */
router.use((req, res, next) => {
    /**
     * 로그인 값을 app.js에서 처리하여 넘겨받아 사용.
     * id는 accesskey 값으로 password는 secretaccesskey 값으로 설정.
     * @type {{password: any, login: any}}
     */
    const auth = {login: res.locals.id, password: res.locals.password};
    /**
     * 로그인 값을 인증용 값으로 변환
     * @type {string|string}
     */
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    /**
     * 인코딩 값에서 id와 password를 확인.
     */
    const [login, password] = new Buffer(b64auth, 'base64').toString().split(':');

    /**
     * 입력받은 login, password가 database 값과 같은지 확인.
     * 같으면 next() 함수로 넘어감.
     */
    if (login && password && login === auth.login && password === auth.password) {
        return next();
    }

    /**
     * 로그인 인증 실패시 인증 실패로 response 설정
     */
    res.set('WWW-Authenticate', 'Basic realm="401"');
    /**
     * 401 에러로 설정된 값을 반환.
     */
    res.status(401).send('Authentication required.');
});

/**
 * account 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.get('/', function (req, res, next) {
    need_build(req, res);
});

/**
 * account 생성용 API
 * 이 함수는 private Key를 포함하여 반환함.
 */
router.post('/create_base', async function (req, res, last_function) {
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
router.post('/create', async function (req, res, last_function) {
    /**
     * 사용자 계정 생 API를 호출
     */
    let value = caver.klay.accounts.create()
    /**
     * Database 연결을 parameter로 받음.
     * @type {any}
     */
    let connection = res.locals.connection

    /**
     * database용 sql 구문을 작성
     * @type {string}
     */
    let sql = `Insert into account (address, publicKey, privateKey, svcID) values (?, ?, ?, ?)`
    /**
     * sql 구문의 변수에 값을 채워 질의문구 완성
     */
    connection.query(sql, [value.address, value.accountKey._key, value.privateKey, res.locals.svcID])
    /**
     * 쿼리를 commit하여 전송 완료
     */
    connection.commit()
    /**
     * 생성된 account의 주소를 반환.
     * @type {{address}}
     */
    let report = {
        "address": value.address
    }
    /**
     * 만들어진 json 내용를 반환.
     */
    res.send(report)
});

/**
 * account List 내용 API
 * svc에서 해당하는 account 계정들의 list를 확인하기 위한 API.
 * PrivateKey를 포함한 정보를 반환하는 API
 * @return
 */
router.post('/getList_base', async function (req, res, last_function) {
    /**
     * database에서 사용자 계정 리스트를 작성함.
     * @type {*}
     */
    let value = await db_works.getAccounts(res.locals.connection, req.body.svcID)
    /**
     * privateKey를 포함한 정보를 반환.
     */
    res.send(value[0])
});

/**
 * account List 내용 API
 * svc에서 해당하는 account 계정들의 list를 확인하기 위한 API
 * PrivateKey를 제외한 정보를 반환하는 API
 * @param path - router path
 * @return None
 */
router.post('/getList', async function (req, res, last_function) {
    /**
     * database에서 사용자 계정 리스트를 작성함.
     * @type {*}
     */
    let value = await db_works.getOnluAddresses(res.locals.connection, req.body.svcID)
    /**
     * privateKey를 포함한 정보를 반환.
     */
    res.send(value[0])
});

/**
 * 등록된 계정여부를 확인하기 위한 함수.
 */
router.post('/isExist', async function (req, res, next) {
    let connection = res.locals.connection

    let sql = 'select address from account WHERE address = ?'

    let result = await connection.query(sql, [req.body.address])

    // select 결과 존재하는 address 인 경우에는 검색되어 1이 반환되고
    // 없는 address 라면 0이 반환된다.
    if (result[0].length === 1) {
        res.send('{"status": true}')
    } else {
        res.send('{"status": false}')
    }
})

/**
 * 외부 계정을 등록하기 위한  API 함수
 */
router.post('/register', async function (req, res, last_function) {
    /**
     * 동일한 주소를 추가할 경우에 SQL 에러가 발생하면서
     * 예외처리가 필요함.
     */
    try {
        let connection = res.locals.connection

        /**
         * account 를 등록하기 위한 database sql 문구
         * @param address 지갑의 주소
         * @param accountkey 지갑의 공개키
         * @param privatekey 지갑의 비밀키
         * @type {string}
         */
        let sql = `Insert into account (address, publicKey, privateKey, svcID, imported, type) values (?, ?, ?, ?, ?, ?)`

        // database 의 account 내용으로 등록할 값들을 사용하여 database 기록
        await connection.query(sql,
            [req.body.address, req.body.accountkey, req.body.privatekey, res.locals.svcID, 1, res.locals.type])

        // 기록한 내용을 API 값으로 반환
        res.send('{"status": true, "Address": "' + req.body.address + '"}')
    } catch (err) {
        res.send('{"status": false, "message": "Insert error"}')
    }
});

/**
 * 외부 계정을 등록해제하기 위한  API 함수
 * TODO: 지갑 주소의 validation
 */
router.post('/unregister', async function (req, res, last_function) {
    let connection = res.locals.connection
    /**
     * account 를 등록하기 위한 database sql 문구
     * @param address 지갑의 주소
     * @param accountkey 지갑의 공개키
     * @param privatekey 지갑의 비밀키
     * @type {string}
     */
    let sql = `DELETE FROM account WHERE address = ? AND privatekey = ?`

    // database 의 account 내용으로 등록할 값들을 사용하여 database 기록
    let result = await connection.query(sql, [req.body.address, req.body.privatekey])

    // 기록한 내용을 API 값으로 반환
    if (result[0].affectedRows === 0) {
        res.send('{"status": false, "Address": "Do not found address."}')
    } else {
        res.send('{"status": true, "Address": "' + req.body.address + '"}')
    }
});

/**
 * account 정보 update API
 * 미구현 함수.
 */
router.get('/update', function (req, res, last_function) {
    need_build(req, res);
});

/**
 * account balance 구하는 함수
 * 반환값:  {"balance": 100000000000000000} = 0.1 klay
 */
router.post('/:eoa/balance', async function (req, res, last_function) {
    let caver = get_caver(res.locals.netID)
    let balance = await caver.rpc.klay.getBalance(req.params.eoa)
    let result = parseInt(balance)
    res.send('{"balance": ' + result + '}')
});

/**
 * FT 잔액 확인용 API
 * contract 주소의 contract 확인 루틴 추가.
 * @return
    {
    "address": "0x(account address)",
    "ft": "0x(ft address)",
    "values": "0.000000000000000000",
    }
 */
router.post('/:eoa/balanceFT/:contract', async function (req, res, last_function) {
    let caver = get_caver(res.locals.netID)
    let isContract = await caver.rpc.klay.isContractAccount(req.params.contract)

    if (isContract === true) {
        const kip7 = new caver.kct.kip7(req.params.contract)
        let balance = await kip7.balanceOf(req.params.eoa)
        result = {
            "address": req.params.eoa,
            "contract": req.params.contract,
            "values": balance
        }
    } else {
        result = {
            "address": req.params.eoa,
            "contract": req.params.contract,
            "values": "None"
        }
    }

    res.send(result)
});

/**
 * account의 klay 전송용 API
 */
router.post('/:eoa/txs/:page?', async function (req, res, last_function) {
    let result = lib_kct.AccountTxs(res.locals.netID, req.params.eoa, req.params.page)
    res.send(await result)
});

/**
 * account의 klay 전송 기록용 API
 */
router.post('/:eoa/transfers/:page?', async function (req, res, last_function) {
    let result = lib_kct.AccountTransfers(res.locals.netID, req.params.eoa, req.params.page)
    res.send(await result)
});

/**
 * FT 전송 기록 확인용 API
 */
router.get('/:eoa/transferFT', async function (req, res, last_function) {
    let transfers = await lib_kct.AccountTransfers(req.params.eoa)
    res.send(transfers)
});

/**
 * 수수료 대납용 KLAY 전송 API
 */
router.post('/:eoa/transferWithFee', async function (req, res, last_function) {
    let caver = get_caver(res.locals.netID)
    /**
     * 전송 지갑의 주소를 sender 에 설정
     */
    let sender = req.params.eoa
    /**
     * 수신 지갑의 주소를 receiver 에 설정
     */
    let receiver = req.body.receiver
    /**
     * 전송할 KLAY 수량을 amount 에 설정
     */
    let amount = req.body.amount
    /**
     * 수수료를 대납할 계정의 PrivateKey 를 feePayerKey 에 설정
     */
    let feePayerKey = res.locals.config.klaytn.feePayerKey

    /**
     * 전송 지갑의 private key 를 Database에서 가져옴.
     * @type {*}
     */
    let privateKey = await db_works.getPrivateKeyOf(res.locals.connection, sender)

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
 * 수수료 대납용 FT 전송 API
 */
router.post('/:aoa/transferFTWithFee/', async function (req, res, last_function) {
    /**
     * 전송 지갑의 주소를 sender 에 설정
     */
    let sender = req.params.aoa
    /**
     * 수신 지갑의 주소를 receiver 에 설정
     */
    let receiver = req.body.receiver
    /**
     * 전송하려는 token 의 수량을 amount 에 설정
     */
    let amount = req.body.amount
    /**
     * 수수료를 대납할 계정의 privateKey 를 설정
     */
    let feePayerKey = res.locals.config.klaytn.feePayerKey
    /**
     * 전송하려는 token 의 contract 주소를 contract 에 설정.
     * @type {Contract}
     */
    let contract = res.locals.config.klaytn.contract

    /**
     * 전송 지갑의 private key 를 Database에서 가져옴.
     * @type {*}
     */
    let privateKey = await db_works.getPrivateKeyOf(res.locals.connection, sender)

    /**
     * transaction encoding 데이터를 만든다.
     * @type {string}
     */
    const rlpEncodedStr = await RLPEncodingInputWithFee(privateKey, receiver, contract, amount)

    /**
     * rlp 인코딩 데이터를 수수료 대납 전송용 transaction 으로 만든다.
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
 * feePayer 의 주소가 정해져 있지 않기 때문에 params 로 feePayer 주소를 전달.
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
    let privateKey = await db_works.getPrivateKeyOf(res.locals.connection, sender)

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
 * FT 전송용  API (with DB)
 * Database 에 등록된 계정 정보를 이용하여 전송하는 명령.
 * Database 에 등록된 계정만 사용 가능하므로 계정의 database 등록 여부를 확인하여야 함.
 */
router.post('/:aoa/transferFT/:ft', async function (req, res, last_function) {
    /**
     * 지갑 주소를 sender 에 입력
     */
    let sender = req.params.aoa
    /**
     * 수신자를 receiver 에 입력
     * @type {RTCRtpReceiver}
     */
    let receiver = req.body.receiver
    /**
     * 전송량을 amount 에 입력
     */
    let amount = req.body.amount
    /**
     * 전송하려는 token 주소를 contract 에 입력
     */
    let contract = req.params.ft

    /**
     * 전송 권환 획득을 위해 Database 에서 privateKey 를 획득.
     * @type {*}
     */
    let privateKey = await db_works.getPrivateKeyOf(res.locals.connection, sender)

    /**
     * Token 전송 명령을 실행하기 위해 contract instance 를 작성.
     * @type {Klay.KIP7}
     */
    let kip7Instance = new caver.klay.KIP7(contract)
    /**
     * address 와 privateKey 로 사용자 계정 instance 를 생성.
     */
    const account = caver.klay.accounts.createWithAccountKey(sender, privateKey)
    /**
     * wallet instance 에 계정 정보를 추가.
     */
    caver.klay.accounts.wallet.add(account)
    /**
     * receiver 에게 amount 만큼의 token 량을 전송
     * @type {*}
     */
    let reply = await kip7Instance.transfer(receiver, amount, {from: sender})
    /**
     * wallet 에서 계정 정보를 삭제.
     */
    caver.klay.accounts.wallet.remove(account.address)

    /**
     * API 의 결과로 전송
     */
    res.send(reply)
});

module.exports = router;
