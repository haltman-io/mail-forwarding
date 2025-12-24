"use strict";

/**
 * MariaDB Connector/Node.js (Promise API)
 * - Pool único
 * - Todas as queries com placeholders => proteção contra SQL injection
 *
 * Docs:
 * - createPool(): https://mariadb.com/docs/connectors/mariadb-connector-nodejs/getting-started-with-the-node-js-connector :contentReference[oaicite:1]{index=1}
 * - boas práticas: pool + parameterized queries :contentReference[oaicite:2]{index=2}
 */

const mariadb = require("mariadb");
const { app_environment } = require("../config/app_environment");

let _pool = null;

function getPool() {
    if (_pool) return _pool;

    _pool = mariadb.createPool({
        host: app_environment.MARIADB_HOST,
        port: app_environment.MARIADB_PORT,
        user: app_environment.MARIADB_USER,
        password: app_environment.MARIADB_PASSWORD,
        database: app_environment.MARIADB_DATABASE,

        connectionLimit: 10,

        // Segurança/robustez:
        // - deixe "multipleStatements" DESLIGADO (default) para reduzir superfície de abuso
        // - use placeholders (?), nunca concatene SQL
    });

    return _pool;
}

/**
 * Executa uma query parametrizada.
 * Retorna array de rows para SELECT ou objeto para INSERT/UPDATE/DELETE.
 */
async function query(sql, params = []) {
    const pool = getPool();
    let conn;
    try {
        conn = await pool.getConnection();
        return await conn.query(sql, params);
    } finally {
        if (conn) conn.release();
    }
}

/**
 * Transaction helper.
 * Recebe fn(conn) e garante commit/rollback.
 */
async function withTx(fn) {
    const pool = getPool();
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const out = await fn(conn);
        await conn.commit();
        return out;
    } catch (err) {
        try {
            if (conn) await conn.rollback();
        } catch (_) { }
        throw err;
    } finally {
        if (conn) conn.release();
    }
}

module.exports = { getPool, query, withTx };
