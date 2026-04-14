const express = require('express')
const app = express()

app.use(express.json())

app.get('/health', (req, res) => {
    res.json({status: 'ok', version: '1.0.0'})
})

app.post('/soma', (req, res) => {
    const { a, b } = req.body
    if (typeof a !== 'number' || typeof b !== 'number') {
        return res.status(400).json({ error: 'a e b devem ser números' })
    }
    return res.json({ resultado: a + b })
})

module.exports = app