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
        default:"https://www.nicepng.com/png/detail/131-1318812_avatar-group-icon.png"
    },
    latestMessage: {
        type: Schema.Types.ObjectId,
        ref: "messages"
    },
    groupAdmin: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
}, { timestamps: true })

module.exports = mongoose.model('chats', chatSchema)