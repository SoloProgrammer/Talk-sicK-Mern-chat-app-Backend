const port = process.env.PORT || 8001
require('dotenv').config()


const connectToSocket = (server) => {

    const io = require('socket.io')(server, {
        pingTimeout: 120000,
        cors: {
            origin: process.env.CLIENT || "http://localhost:3000",
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    })

    let activeUsers = []
    try {
        io.on("connection", (socket) => {
            console.log("connected to socket.io");
            socket.on('setup', (userData) => {
                socket.join(userData._id);
                socket.emit("connected");
                if (!(activeUsers.map(u => u.userId).includes(userData._id))) {
                    activeUsers.push({
                        userId: userData._id,
                        socketId: socket.id
                    });

                    console.log(activeUsers);
                };
                io.emit('activeUsers', activeUsers);
            });


            socket.on("disconnect", () => {
                activeUsers = activeUsers.filter(u => u.socketId !== socket.id);
                console.log("after disconnecting user", activeUsers)
                io.emit('activeUsers', activeUsers)
            })

            socket.on('join chat', (chatRoom) => {
                socket.join(chatRoom)
                console.log("User Joined chatRoom: ", chatRoom)
            })


            //1. taking the user from client side for the groupchat to know who is actually typing from tyhe group will not use this for personal chat

            //2. taking room from the client because after emmiting typing in the client side then will display typing indicator only in that chatroom which is selected as it looks obvious that it will emit it only in the chatroom which all users are in but When itested it causes me some bugs i.e the typing indicator is showing in the prevously join room and the current join room as well so that's the reason to send the room return to the user who will see typing indicator when other user types in the same chat room, it's to explanable but I tried my best to explain in the short!

            socket.on("typing", (room, user) => socket.in(room).emit("typing", user, room))

            socket.on("stop typing", (room) => socket.in(room).emit("stop typing"))

            socket.on('new message', (newMessageRecieved, newMessages) => {

                var chat = newMessageRecieved.chat

                if (!chat) return console.log("chat not defined");

                if (!chat.users) return console.log("chat.users is not defined");

                chat.users.forEach(user => {

                    if (user._id === newMessageRecieved.sender._id) return

                    socket.in(user._id).emit("message recieved", newMessageRecieved, newMessages, user)
                });

            })

            socket.on('seeing messages', (messages, chatUsers, user, room) => {

                if (!chatUsers || chatUsers.length < 1) console.log("chat users are blank");

                if (!messages || messages.length < 1) console.log("messages are blank");

                chatUsers.forEach(u => {
                    if (u._id !== user._id) {
                        socket.in(room).emit('seen messages', messages, room)
                    }
                })
            })

        })
    } catch (error) {
        console.log("Some error occured while connecting with the socket.io ERROR: ", error)
    }
}

module.exports = connectToSocket