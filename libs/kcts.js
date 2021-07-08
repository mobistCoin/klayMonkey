/**
 * Database 에서 Private Key 읽어오기
 * @param connection Database 연결
 * @param address Private key 를 읽가져오려는 지갑 주소
 * @returns {Promise<*>} Private Key
 */
module.exports.getPrivateKeyOf = async function (connection, address) {
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
 * Database 계좌 정보를 읽어와서 전체 내용을 json으로 반환
 * @param connection
 * @returns {Promise<*>}
 */
module.exports.getAccounts = async function (connection) {
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

/**
 * 인코딩된 Smart Contract Data 생성용 함수
 * @param address 토큰 전송 대상 주소
 * @param amount 토큰 전송 수량
 * @returns {string} 인코딩된 데이터
 */
module.exports.transferByteInput = function (address, amount) {
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