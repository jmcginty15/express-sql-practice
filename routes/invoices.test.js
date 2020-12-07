process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const db = require('../db');

beforeEach(function () {
    db.query(`INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES ($1, $2, $3, $4, $5)`,
        ['ibm', 800, false, '2020-01-01', null]);
});

afterEach(function () {
    db.query(`DELETE FROM invoices
        WHERE comp_code = $1 AND amt IN ($2, $3)`,
        ['ibm', 800, 1000]);
});

describe('GET /invoices', function () {
    test('Get full list of invoices', async function () {
        const res = await request(app).get(`/invoices`);
        expect(res.statusCode).toBe(200);
        expect(res.body.invoices).toContainEqual({ id: 1, comp_code: 'apple' });
        expect(res.body.invoices).toContainEqual({ id: 2, comp_code: 'apple' });
        expect(res.body.invoices).toContainEqual({ id: 3, comp_code: 'apple' });
        expect(res.body.invoices).toContainEqual({ id: 4, comp_code: 'ibm' });
    });
});

describe('POST /invoices', function () {
    test('Post a new invoice', async function () {
        const res = await request(app).post(`/invoices`).send({ comp_code: 'ibm', amt: 1000 });
        expect(res.statusCode).toBe(201);
        const invoice = res.body.invoice;
        expect(invoice.comp_code).toBe('ibm');
        expect(invoice.amt).toBe(1000);
        expect(invoice.paid).toBe(false);
        expect(invoice.paid_date).toBe(null);
    });
});

describe('GET /invoices/:id', function () {
    test('Get an invoice by id', async function () {
        const res = await request(app).get(`/invoices/1`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            invoice: {
                id: 1,
                amt: 100,
                paid: false,
                add_date: '2020-12-06T06:00:00.000Z',
                paid_date: null,
                company: {
                    code: 'apple',
                    name: 'Apple Computer',
                    description: 'Maker of OSX.'
                }
            }
        })
    });

    test('Responds with 404 if invoice not found', async function () {
        const res = await request(app).get(`/invoices/42069`);
        expect(res.statusCode).toBe(404);
    });
});

describe('PUT /invoices/:id', function () {
    test('Update an invoice by id', async function () {
        const result = await db.query(`SELECT id FROM invoices
            WHERE amt = $1`,
            [800]);
        const id = result.rows[0].id;
        const res = await request(app).put(`/invoices/${id}`).send({ amt: 1000, paid: false });
        expect(res.statusCode).toBe(200);
        const invoice = res.body.invoice;
        expect(invoice.comp_code).toBe('ibm');
        expect(invoice.amt).toBe(1000);
        expect(invoice.paid).toBe(false);
        expect(invoice.paid_date).toBe(null);
    });

    test('Pay or unpay an invoice', async function() {
        const result = await db.query(`SELECT id FROM invoices
            WHERE amt = $1`,
            [800]);
        const id = result.rows[0].id;
        
        const res1 = await request(app).put(`/invoices/${id}`).send({ amt: 800, paid: true });
        expect(res1.statusCode).toBe(200);
        const invoice1 = res1.body.invoice;
        expect(invoice1.paid).toBe(true);
        expect(invoice1.paid_date).not.toBe(null);

        const res2 = await request(app).put(`/invoices/${id}`).send({ amt: 800, paid: false });
        expect(res2.statusCode).toBe(200);
        const invoice2 = res2.body.invoice;
        expect(invoice2.paid).toBe(false);
        expect(invoice2.paid_date).toBe(null);
    });

    test('Responds with 404 if invoice not found', async function () {
        const res = await request(app).put(`/invoices/42069`).send({ amt: 42069 });
        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /invoices/:id', function () {
    test('Deletes an invoice from the database and responds with the appropriate message', async function () {
        const result = await db.query(`SELECT id, add_date FROM invoices
            WHERE amt = $1`,
            [800]);
        const id = result.rows[0].id;
        const add_date = result.rows[0].add_date;
        const res = await request(app).delete(`/invoices/${id}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'deleted' });

        const results = await db.query(`SELECT * FROM invoices`);
        expect(results.rows).not.toContainEqual({ id: id, comp_code: 'ibm', amt: 800, paid: false, add_date: add_date, paid_date: null });
    });

    test('Responds with 404 if invoice not found', async function () {
        const res = await request(app).delete(`/invoices/42069`);
        expect(res.statusCode).toBe(404);
    });
});
