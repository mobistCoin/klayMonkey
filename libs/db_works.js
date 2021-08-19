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
    console.log(value[0][0])

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
module.exports.getAccounts = async function (connection, svcID) {
    /**
     * svc_id에 매칭되는 id와 password를 가져옴.
     * @type {string}
     */
    sql = 'SELECT * FROM account where svcId="' + svcID + '"'

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
 * Database 계좌 정보를 읽어와서 계좡 정보만 반환
 * @param connection
 * @returns {Promise<*>}
 */
module.exports.getOnluAddresses = async function (connection, svcID) {
    /**
     * svc_id에 매칭되는 id와 password를 가져옴.
     * @type {string}
     */
    sql = 'SELECT address FROM account where svcId="' + svcID + '"'

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

module.exports.is_address = async function (connection, address, svcID) {
    let sql = 'SELECT EXISTS(SELECT address FROM account where svcID="' + svcID + '" and address="' + address +
        '") as success'
    let value = await connection.query(sql)
    // TextRow { success: 1 }
    return value[0][0].success
}

module.exports.getBalancesOfFT = async function (connection, address, ft) {
    /**
     * svc_id에 매칭되는 id와 password를 가져옴.
     * @type {string}
     */
    sql = 'SELECT * FROM balance where address="' + address + '" and ft ="' + ft + '"'

    console.log(sql)

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
