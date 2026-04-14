const request = require('supertest')
const app = require('./app')

describe('GET /health', () => {
    it('deve retornar ok', async () => {
        const res = await request(app).get('/health')
        expect(res.statusCode).toBe(200)
        expect(res.body).toEqual({status: 'ok', version: '1.0.0'})
    })
})

describe('POST /soma', () => {
    it('soma dois números corretamente', async () => {
        const res = await request(app)
            .post('/soma')
            .send({a: 3, b: 4})
        expect(res.status).toBe(200)
        expect(res.body.resultado).toBe(7)
    })

    it('retorna 400 para valores inválidos', async () => {
        const res = await request(app)
            .post('/soma')
            .send({a: 'x', b: 'y'})
        expect(res.status).toBe(400)
    })
})