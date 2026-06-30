const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema(
{
    name: {
        type: String,
        default: ""
    },

    type: {
        type: String,
        default: ""
    },

    size: {
        type: Number,
        default: 0
    },

    data: {
        type: String,
        default: ""
    }

},
{
    _id: false
}
);

const NoteSchema = new mongoose.Schema(
{
    title: {
        type: String,
        default: "Untitled Note"
    },

    content: {
        type: String,
        default: ""
    },

    shared: {
        type: Boolean,
        default: false
    },

    shareToken: {
        type: String,
        default: null
    },

    shareIncludeFiles: {
        type: Boolean,
        default: false
    },

    attachments: {
        type: [AttachmentSchema],
        default: []
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

},
{
    timestamps: true
}
);

module.exports =
mongoose.model(
"Note",
NoteSchema
);