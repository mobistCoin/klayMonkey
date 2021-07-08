const express = require('express');
const router = express.Router();
const debug = require('debug')('contract')
const Caver = require('caver-js')
// const caver = new Caver('http://52.195.6.63:8551/')
const caver = new Caver('https://api.baobab.klaytn.net:8651/')
const libkcts = require('libkct')
const axios = require('axios')

const kip7 = new caver.kct.kip7()

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
router.get('/', async function (req, res, next) {
    let isContract = await caver.rpc.klay.isContractAccount(res.locals.config.klaytn.contract)
    res.send({"status": true, "value": isContract});
});

/**
 * contract 정보를 확인하고 전체 명령을 제어할 수 있는 PAGE
 */
router.get('/valid', async function (req, res, next) {
    let isContract = await caver.rpc.klay.isContractAccount(res.locals.config.klaytn.contract)
    res.send({"status": true, "value": isContract});
});

/**
 * holders list
 */
router.get('/holders', async function (req, res, next) {
    const response = libkcts.ContractHolders(res.locals.config.klaytn.contract);
    let result = await response;
    let lists = result.result

    res.send(lists)
});

/**
 * contract transfer history
 */
router.get('/transfers', async function (req, res, next) {
    const Info = libkcts.ContractTransfers(res.locals.config.klaytn.contract);
    let info_json = await Info;

    res.send(info_json);
});

/**
 * Token 의 account 가 가지는 수량을 확인
 */
router.get('/balanceOf/:aoa', async function (req, res, next) {
    kip7.options.address = res.locals.config.klaytn.contract
    let balance = await kip7.balanceOf(req.params.aoa)
    res.send('{"status": True, "balance": ' + Number.parseFloat(balance).toFixed(0) + '}')
});

module.exports = router;
