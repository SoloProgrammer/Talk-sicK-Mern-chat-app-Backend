require('dotenv').config()
require("colors");
const Socket = require('socket.io')

const connectToSocket = (server) => {

    const io = Socket(server, {
        pingTimeout: 120000,
        cors: {
            origin: process.env.ALLOWED_ORIGINS.split(', '),
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        }
    });

    let activeUsers = []

    let typingInfo = []
    try {
        io.on("connection", (socket) => {
            console.log("connected to socket.io".bgCyan.underline);
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

            socket.on("typing", (room, user) => {
                const { name, _id } = user
                user = { name, _id }
                if (typingInfo.length) {
                    if (!typingInfo.map(tyI => tyI.chatId).includes(room) || !typingInfo.map(tyI => tyI.user?._id).includes(user._id)) {
                        typingInfo.push({ user, chatId: room })
                    }
                } else typingInfo.push({ user, chatId: room })

                io.emit("typing", user, typingInfo)
            })

            socket.on("stop typing", (room, user) => {
                // console.log("before typinfInfo", typingInfo);

                typingInfo = typingInfo.filter(tyI => {
                    if ((tyI.chatId !== room && tyI.user._id !== user._id) || (tyI.chatId === room && tyI.user._id !== user._id)) return tyI
                })
                io.emit("stop typing", typingInfo)
                // console.log("after typinfInfo", typingInfo);
            })

            socket.on('new message', (newMessageRecieved) => {

                var chat = newMessageRecieved.chat

                usersLeftTheGroupChat = newMessageRecieved?.chat?.leftFromGroup.map(item => String(item.user))

                if (!chat) return console.log("chat not defined");

                if (!chat.users) return console.log("chat.users is not defined");

                chat.users.forEach(user => {

                    if (user._id === newMessageRecieved.sender._id || (newMessageRecieved?.chat?.isGroupchat && usersLeftTheGroupChat.includes(String(user._id)))) return

                    socket.in(user._id).emit("message recieved", newMessageRecieved, user)
                });
            })

            socket.on('seeing messages', (room, totalMessages, updatedChat) => {

                if (!room) console.error("Room id not provided")
                socket.in(room).emit('seen messages', room, totalMessages, updatedChat)
            })

            socket.on('delete message', (deletedMsg) => {
                io.emit('deleted message', deletedMsg)
            })

            socket.on('react message', (reactedMsg, reacted_user) => {
                console.log("reacted to -");
                io.emit('react message', reactedMsg, reacted_user)
            })

            socket.on('group created', (createdBy, createdGrp) => {
                const grpUsersIds = createdGrp.users.map(u => u._id)
                grpUsersIds.forEach(uId => {
                    uId !== createdBy._id && socket.in(uId).emit('group created', createdGrp)
                })
            })
        })
    } catch (error) {
        console.log("Some error occured while connecting with the socket.io ERROR: ", error)
    }
}

module.exports = connectToSocket