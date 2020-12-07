process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const db = require('../db');

beforeEach(function () {
    db.query(`INSERT INTO companies
        VALUES ($1, $2, $3)`,
        ['spacex', 'SpaceX', 'Builder of cool rockets and stuff.']);
});

afterEach(function () {
    db.query(`DELETE FROM companies WHERE code = $1`, ['microsoft']);
    db.query(`DELETE FROM companies WHERE code = $1`, ['spacex']);
    db.query(`UPDATE COMPANIES
        SET name = $1, description = $2
        WHERE code = $3`,
        ['Apple Computer', 'Maker of OSX.', 'apple']);
});

describe('GET /companies', function () {
    test('Get full list of companies', async function () {
        const res = await request(app).get(`/companies`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            companies: [
                { code: 'apple', name: 'Apple Computer' },
                { code: 'ibm', name: 'IBM' },
                { code: 'spacex', name: 'SpaceX' }
            ]
        });
    });
});

describe('POST /companies', function () {
    test('Post a new company', async function () {
        const code = 'microsoft';
        const name = 'Microsoft';
        const description = 'Maker of Microsoft Windows.';
        const res = await request(app).post(`/companies`).send({ code: code, name: name, description: description });
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({ company: { code, name, description } });
    });
});

describe('GET /companies/:code', function () {
    test('Get a company by code', async function () {
        const res = await request(app).get(`/companies/apple`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            company:
            {
                code: 'apple',
                name: 'Apple Computer',
                description: 'Maker of OSX.',
                invoices: [1, 2, 3]
            }
        });
    });

    test('Responds with 404 if company not found', async function () {
        const res = await request(app).get(`/companies/tesla`);
        expect(res.statusCode).toBe(404);
    });
});

describe('PUT /companies/:code', function () {
    test('Update a company by code', async function () {
        let name = 'Apple';
        let description = 'Not Microsoft.';
        let res = await request(app).put(`/companies/apple`).send({ name: name, description: description });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ company: { code: 'apple', name: name, description: description } });
    });

    test('Responds with 404 if company not found', async function () {
        const res = await request(app).put(`/companies/tesla`).send({ name: 'Tesla', description: 'Maker of cool stuff' });
        expect(res.statusCode).toBe(404);
    });
});

describe('DELETE /companies/:code', function () {
    test('Deletes a company from the database and responds with the appropriate message', async function () {
        const res = await request(app).delete(`/companies/spacex`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'deleted' });

        const results = await db.query(`SELECT * FROM companies`);
        expect(results.rows).not.toContainEqual({ code: 'spacex', name: 'SpaceX', description: 'Builder of cool rockets and stuff.' })
    });

    test('Responds with 404 if company not found', async function () {
        const res = await request(app).delete(`/companies/tesla`);
        expect(res.statusCode).toBe(404);
    });
});
