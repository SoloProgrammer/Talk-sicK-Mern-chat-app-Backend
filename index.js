const express = require('express')

var cors = require('cors')

const connetToMongo = require('./config/db.js')

const userRoutes = require('./routes/userRoutes')
const chatRoutes = require('./routes/chatRoutes')
const messageRoutes = require('./routes/messageRoutes')


connetToMongo()

const port = process.env.PORT || 8001

const app = express()
app.use(cors())

app.use(express.json())

app.get('/', (req, res) => res.send('Server is running........'))

app.use('/api/user', userRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/message', messageRoutes)

const server = app.listen(port, () => console.log(` ChatApp Backend is running on server...${port} `))

const io = require('socket.io')(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://localhost:3000"
    }
})

io.on("connection", (socket) => {
    console.log("connected to socket.io");

    socket.on('setup', (userData) => {
        socket.join(userData._id);
        console.log(userData._id);
        socket.emit("connected")
    })

    socket.on('join chat', (chatRoom) => {
        socket.join(chatRoom)
        console.log("User Joined chatRoom: ", chatRoom)
    })
})