const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chatSchema = new Schema({
    chatName: {
        type: String,
        trim: true,
        required: true
    },
    users: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    isGroupchat: {
        type: Boolean,
        default: false
    },
    groupAvatar: {
        type: String,
        default:"https://cdn-icons-png.flaticon.com/512/4596/4596328.png"
    },
    latestMessage: {
        type: String,
        ref: "messages"
    },
    groupAdmin: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
}, { timestamps: true })

module.exports = mongoose.model('chats', chatSchema)