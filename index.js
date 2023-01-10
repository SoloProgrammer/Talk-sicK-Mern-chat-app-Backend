const express = require('express')

var cors = require('cors')

const connetToMongo = require('./config/db.js')

const userRoutes = require('./routes/userRoutes')
const chatRoutes = require('./routes/chatRoutes')


connetToMongo()

const port = process.env.PORT || 8001

const app = express()
app.use(cors())

app.use(express.json())

app.get('/',(req,res)=> res.send('Server is running........'))

app.use('/api/user',userRoutes)
app.use('/api/chat',chatRoutes)

app.listen(port,()=> console.log(` ChatApp Backend is running on server...${port} `))