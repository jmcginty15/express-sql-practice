const express = require('express');
const db = require('../db');
const ExpressError = require('../expressError');
const router = new express.Router();

router.get('/', async (request, response, next) => {
    try {
        const results = await db.query(`SELECT id, comp_code FROM invoices`);
        return response.json({ invoices: results.rows });
    } catch (err) {
        return next(err);
    }
});

router.get('/:id', async (request, response, next) => {
    try {
        const invoiceResults = await db.query(`SELECT * FROM invoices
            WHERE id = $1`,
            [request.params.id]);

        if (invoiceResults.rowCount === 0) {
            throw new ExpressError(`Invoice ${request.params.id} not found`, 404);
        } else {
            const invoice = invoiceResults.rows[0]
            const compResults = await db.query(`SELECT * FROM companies
                WHERE code = $1`,
                [invoice.comp_code]);

            return response.json({
                invoice: {
                    id: invoice.id,
                    amt: invoice.amt,
                    paid: invoice.paid,
                    add_date: invoice.add_date,
                    paid_date: invoice.paid_date,
                    company: compResults.rows[0]
                }
            });
        }
    } catch (err) {
        return next(err);
    }
});

router.post('/', async (request, response, next) => {
    try {
        const newInvoice = request.body;
        const results = await db.query(`INSERT INTO invoices (comp_code, amt)
            VALUES ($1, $2)
            RETURNING *`,
            [newInvoice.comp_code, newInvoice.amt]);
        return response.status(201).json({ invoice: results.rows[0] });
    } catch (err) {
        return next(err);
    }
});

router.put('/:id', async (request, response, next) => {
    try {
        const results = await db.query(`UPDATE invoices
            SET amt = $1
            WHERE id = $2
            RETURNING *`,
            [request.body.amt, request.params.id]);

        if (results.rowCount === 0) {
            throw new ExpressError(`Invoice ${request.params.id} not found`, 404);
        } else {
            return response.json({ invoice: results.rows[0] });
        }
    } catch (err) {
        return next(err);
    }
});

router.delete('/:id', async (request, response, next) => {
    try {
        const results = await db.query(`DELETE FROM invoices
            WHERE id = $1
            RETURNING id`,
            [request.params.id]);

        if (results.rowCount === 0) {
            throw new ExpressError(`Invoice ${request.params.id} not found`, 404);
        } else {
            return response.json({ status: 'deleted' });
        }
    } catch (err) {
        return next(err);
    }
});

module.exports = router;