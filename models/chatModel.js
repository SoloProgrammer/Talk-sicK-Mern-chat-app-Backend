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
        default:"https://tse2.mm.bing.net/th?id=OIP.OtLqKEL4eIvyiNSJZ4pT-wHaHa&pid=Api&P=0"
    },
    latestMessage: {
        type: Schema.Types.ObjectId,
        ref: "messages"
    },
    totalMessages:{
        type:Number
    },
    groupAdmin: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
}, { timestamps: true })

module.exports = mongoose.model('chats', chatSchema)