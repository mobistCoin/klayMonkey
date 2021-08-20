const express = require('express');
const router = express.Router();
const debug = require('debug')('contract')
const Caver = require('caver-js')
const libkcts = require('libkct')
const axios = require('axios')

const setting = require('../libs/variable')
const {ER_INNODB_FORCED_RECOVERY} = require("mysql/lib/protocol/constants/errors");
// const kip7 = new caver.kct.kip7()

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
 * contract 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.get('/', async function (req, res, next) {
    let isContract = await caver.rpc.klay.isContractAccount(res.locals.config.klaytn.contract)

    res.send({"status": true, "value": isContract});
});

/**
 * contract 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.use('/:contract', async function (req, res, next) {
    let caver = get_caver(res.locals.netID)

    let isContract = await caver.rpc.klay.isContractAccount(req.params.contract)
    console.log(isContract)
    if (isContract !== true) {
        res.send({"status": true, "value": isContract});
        return
    }
    next()
});

/**
 * holders list 반환하는 함수
 */
router.post('/:contract/holders', async function (req, res, next) {
    const response = libkcts.ContractHolders(res.locals.netID, req.params.contract);
    let result = await response;
    let lists = result.result

    res.send(lists)
});

/**
 * contract transfer history
 * page 마다 25건의 전송 내역을 출력함.
 */
router.post('/:contract/transfers/:page?', async function (req, res, next) {
    const Info = libkcts.ContractTransfers(res.locals.netID, req.params.contract, req.params.page);
    let info_json = await Info;

    res.send(info_json);
});

/**
 * Token 의 account 가 가지는 수량을 확인
 */
router.post('/:contract/balanceOf/:eoa', async function (req, res, next) {
    let caver = get_caver(res.locals.netID)
    let kip7 = new caver.kct.kip7()
    kip7.options.address = req.params.contract
    let balance = await kip7.balanceOf(req.params.eoa)
    res.send('{"status": True, "balance": ' + Number.parseFloat(balance).toFixed(0) + '}')
});

/**
 * Smart Contract 관련 거래 내역을 반환
 * page 값을 기초로 페이지별 조회 가능.
 * page 마다 25건의 거래 내역을 출력.
 * contract
 */
router.post('/:contract/txs/:page?', async function (req, res, next) {
    const Info = libkcts.AccountTxs(res.locals.netID, req.params.contract, req.params.page)
    let info_json = await Info

    res.send(info_json)
})

module.exports = router;
