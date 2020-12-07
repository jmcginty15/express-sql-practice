const express = require('express');
const db = require('../db');
const ExpressError = require('../expressError');
const router = new express.Router();

router.get('/', async (request, response, next) => {
    try {
        const results = await db.query(`SELECT code, name FROM companies ORDER BY code`);
        return response.json({ companies: results.rows });
    } catch (err) {
        return next(err);
    }
});

router.get('/:code', async (request, response, next) => {
    try {
        const compResults = await db.query(`SELECT * FROM companies
            WHERE code = $1`,
            [request.params.code]);

        if (compResults.rowCount === 0) {
            throw new ExpressError(`Company ${request.params.code} not found`, 404);
        } else {
            const company = compResults.rows[0];
            const invoiceResults = await db.query(`SELECT id FROM invoices
                WHERE comp_code = $1`,
                [company.code]);
            const invoices = invoiceResults.rows.map((invoice) => { return invoice.id });

            return response.json({
                company: {
                    code: company.code,
                    name: company.name,
                    description: company.description,
                    invoices: invoices
                }
            });
        }
    } catch (err) {
        return next(err);
    }
});

router.post('/', async (request, response, next) => {
    try {
        const newCompany = request.body;
        const results = await db.query(`INSERT INTO companies
            VALUES ($1, $2, $3)
            RETURNING *`,
            [newCompany.code, newCompany.name, newCompany.description]);
        return response.status(201).json({ company: results.rows[0] });
    } catch (err) {
        return next(err);
    }
});

router.put('/:code', async (request, response, next) => {
    try {
        const newCompany = request.body;
        const results = await db.query(`UPDATE companies
            SET name = $1, description = $2
            WHERE code = $3
            RETURNING *`,
            [newCompany.name, newCompany.description, request.params.code]);

        if (results.rowCount === 0) {
            throw new ExpressError(`Company ${request.params.code} not found`, 404);
        } else {
            return response.json({ company: results.rows[0] });
        }
    } catch (err) {
        return next(err);
    }
});

router.delete('/:code', async (request, response, next) => {
    try {
        const results = await db.query(`DELETE FROM companies
            WHERE code = $1
            RETURNING code`,
            [request.params.code]);

        if (results.rowCount === 0) {
            throw new ExpressError(`Company ${request.params.code} not found`, 404);
        } else {
            return response.json({ status: 'deleted' });
        }
    } catch (err) {
        return next(err);
    }
});

module.exports = router;