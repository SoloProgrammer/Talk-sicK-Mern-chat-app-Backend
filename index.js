const express = require('express')

var cors = require('cors')

require('dotenv').config()

const connetToMongo = require('./config/db.js')
const connectToSocket = require('./config/socket.js')

const userRoutes = require('./routes/userRoutes')
const chatRoutes = require('./routes/chatRoutes')
const messageRoutes = require('./routes/messageRoutes')

connetToMongo()

const PORT = process.env.PORT || 8001

const app = express();

// CORS configuration.........
const Allowed_Origins = process.env.ALLOWED_ORIGINS.split(', ');
app.use(cors({ origin: Allowed_Origins }));

// console.log(Allowed_Origins);

app.use(express.json())

app.get('/', (req, res) => res.send(`Server is running........ on PORT ${PORT}`))

app.use('/api/user', userRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/message', messageRoutes)

const server = app.listen(PORT, () => console.log(`Talk-sicK Backend is running on server...${PORT} `))

connectToSocket(server)