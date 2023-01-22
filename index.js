const express = require('express')

var cors = require('cors')

require('dotenv').config()

const connetToMongo = require('./config/db.js')

const userRoutes = require('./routes/userRoutes')
const chatRoutes = require('./routes/chatRoutes')
const messageRoutes = require('./routes/messageRoutes')

const Chat = require('./models/chatModel')
const User = require('./models/userModel')
const { fetchallchatsCommon } = require('./config/chatConfig.js')


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
    pingTimeout: 120000,
    cors: {
        origin: process.env.CLIENT || "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
})

try {
    io.on("connection", (socket) => {
        console.log("connected to socket.io");

        socket.on('setup', (userData) => {
            socket.join(userData._id);
            socket.emit("connected")
        })

        socket.on('join chat', (chatRoom) => {
            socket.join(chatRoom)
            console.log("User Joined chatRoom: ", chatRoom)
        })

        socket.on('new message', (newMessageRecieved, Previousmessages) => {

            var chat = newMessageRecieved.chat

            if (!chat) return console.log("chat not defined");

            if (!chat.users) return console.log("chat.users is not defined");

            chat.users.forEach(async (user) => {

                if (user._id == newMessageRecieved.sender._id) return

                // refreshedChatswill be used for refreshing all of the chats of that user who recives a new message from another user...................!
                let refreshedChats = await Chat.find(
                    {
                        users: { $elemMatch: { $eq: user._id } }
                    })
                    .populate('users', '-password')
                    .populate('latestMessage')
                    .populate('groupAdmin', '-password')
                    .sort({ updatedAt: -1 })

                    refreshedChats = await User.populate(refreshedChats, {
                    path: "latestMessage.sender",
                    select: "name avatar email phone"
                })

                socket.in(user._id).emit("message recieved", newMessageRecieved, Previousmessages, refreshedChats)
            });

        })
    })
} catch (error) {
    console.log("Some error occured while connecting with the socket.io ERROR: ", error)
}   