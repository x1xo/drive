import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    username: { type:String, unique: true, required: true },
    email: { type:String, unique: true, required: true },
    avatarURL: { type:String, required: true },
    github: {
        id: { type: String },
        username: { type: String },
        avatarURL: { type: String },
    },
    discord: {
        id: { type: String },
        username: { type: String },
        avatarURL: { type: String },
    },
    google: {
        id: { type: String },
        username: { type: String },
        avatarURL: { type: String },
    },

}, { timestamps: true })

export default mongoose.model("users", schema);