const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        require: true,
        ref: 'users'
    },
    content: {
        type: Object,
        require: true
    },
    chat: {
        type: Schema.Types.ObjectId,
        ref: "chats"
    },
    seenBy: [{
        type: Schema.Types.ObjectId,
        ref: "users"
    }],
    deleted: {
        value: { type: Boolean, default: false },
        for: {
            type: String,
            enum: ['everyone', 'myself']
        }
    },
    msgType: {
        type: String,
        enum: ['regular', 'info']
    },
    reactions: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        reaction: {
            type: 'String'
        }
    }]
}, { timestamps: true })

module.exports = mongoose.model('messages', messageSchema)