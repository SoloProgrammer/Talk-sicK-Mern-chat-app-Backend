const express = require('express')

const connetToMongo = require('./config/db.js')

const userRoutes = require('./routes/userRoutes')
const chatRoutes = require('./routes/chatRoutes')


connetToMongo()

const port = process.env.PORT || 8001

const app = express()

app.use(express.json())

app.get('/',(req,res)=> res.send('Server is running........'))

app.use('/api/user',userRoutes)
app.use('/api/chat',chatRoutes)

app.listen(port,()=> console.log(` ChatApp Backend is running on server...${port} `))