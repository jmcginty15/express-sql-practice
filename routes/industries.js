const { response } = require('express');
const express = require('express');
const { request } = require('../app');
const db = require('../db');
const ExpressError = require('../expressError');
const router = new express.Router();

router.get('/', async (request, response, next) => {
    try {
        const results = await db.query(`SELECT code, industry FROM industries ORDER BY code`);
        const industries = results.rows.map(async (industry) => {
            const compResults = await db.query(`SELECT * FROM companies
                WHERE code IN (
                    SELECT comp_code FROM company_industries
                    WHERE ind_code = $1
                )`,
                [industry.code]);
            industry.companies = compResults.rows;
            return industry;
        });

        Promise.all(industries).then(industries => {
            return response.json({ industries: industries });
        });
    } catch (err) {
        return next(err);
    }
});

router.post('/', async (request, response, next) => {
    try {
        const results = await db.query(`INSERT INTO industries (code, industry)
            VALUES ($1, $2)
            RETURNING *`,
            [request.body.code, request.body.industry]);
        return response.json({ industry: results.rows[0] });
    } catch (err) {
        return next(err);
    }
});

router.put('/:code', async (request, response, next) => {
    try {
        const indResults = await db.query(`SELECT code FROM industries WHERE code = $1`, [request.params.code]);
        const compResults = await db.query(`SELECT code FROM companies WHERE code = $1`, [request.body.compCode]);

        if (indResults.rowCount === 0) {
            throw new ExpressError(`Industry ${request.params.code} not found`, 404);
        } else if (compResults.rowCount === 0) {
            throw new ExpressError(`Company ${request.body.compCode} not found`, 404);
        } else {
            const relationResults = await db.query(`SELECT comp_code FROM company_industries
                WHERE comp_code = $1 AND ind_code = $2`,
                [request.body.compCode, request.params.code]);
            
            if (relationResults.rowCount === 0) {
                const finalResults = await db.query(`INSERT INTO company_industries (comp_code, ind_code)
                    VALUES ($1, $2)
                    RETURNING comp_code, ind_code`,
                    [request.body.compCode, request.params.code]);
                return response.json({ relation: finalResults.rows[0] });
            } else {
                return response.json({ status: 'Relation already exists' });
            }
        }
    } catch (err) {
        return next(err);
    }
});

module.exports = router;