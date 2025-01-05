const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
    emotions: { type: [String], required: true }, // Array of emotions
    transcription: { type: String, required: false }, // Transcription text
    timestamp: { type: Date, default: Date.now }, // Timestamp of submission
});

module.exports = mongoose.model("Submission", submissionSchema);
