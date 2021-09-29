/**
 * Database 에서 Private Key 읽어오기
 * @param connection Database 연결
 * @param address Private key 를 읽가져오려는 지갑 주소
 * @returns {Promise<*>} DB 에서 주소를 찾은 경우에는 Private Key<p>
 *                      DB 에서 주소를 찾지 못한 경우에는 null
 */
module.exports.getPrivateKeyOf = async function (connection, address) {
    /**
     * account 테이블에서 address 주소를 검색하는 sql 구문
     * @type {string}
     */
    let sql = 'SELECT * FROM account where address="' + address + '"'

    /**
     * mysql2에서는 query 데이터를 await 처리한 결과
     * @type {*}
     */
    let value = await connection.query(sql)

    if (value[0].length === 0) {
        return null
    }

    // database 에서 찾은 address 주소의 privateKey 값을 반환.
    return value[0][0].privateKey
}

/**
 * Database 계좌 정보를 읽어와서 전체 내용을 json으로 반환
 * @param connection
 * @param svcID
 * @return {Promise<*>}
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
 * Database 계좌 정보를 읽어와서 계좌 정보만 반환
 * @param connection
 * @param svcID
 * @return {Promise<*>}
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

/**
 * svcID와 EOA를 바탕으로 Database의 account 테이블에서 계좌 주소가 존재하는지 여부를 반환
 * @param connection Database 연결 handler
 * @param EOA 찾으려는 계좌 주소
 * @param svcID EOA가 속하는 svcID
 * @return {Promise<*>} EOA가 svcID에 속하면 1이 반환.<p>EOA가 svcID에 속하지 않으면 0이 반환.
 */
module.exports.is_address = async function (connection, EOA, svcID) {
    let sql = 'SELECT EXISTS(SELECT * FROM account where svcID="' + svcID + '" and address="' + EOA +
        '") as success'
    let value = await connection.query(sql)

    return value[0][0].success
}
