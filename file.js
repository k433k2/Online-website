const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Define the schema for storing processed file information
const FileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toolType: {
        type: String,
        required: true,
        enum: ['merge', 'split', 'compress', 'word', 'excel', 'convert']
    },
    originalName: {
        type: String,
        required: true
    },
    processedName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// TTL index to automatically delete expired file documents
FileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Optional: virtual property to generate a download URL
FileSchema.virtual('downloadUrl').get(function () {
    return `/api/files/${this._id}`;
});

// Optional: Pre-remove hook to delete physical file from disk (not required unless managing files actively)
FileSchema.pre('remove', function (next) {
    if (fs.existsSync(this.path)) {
        fs.unlink(this.path, (err) => {
            if (err) console.error('Error deleting file from disk:', err);
            next();
        });
    } else {
        next();
    }
});

module.exports = mongoose.model('File', FileSchema);
