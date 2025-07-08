const mongoose = require('mongoose');

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
        required: true,
        default: 0
    },
    downloadCount: {
        type: Number,
        default: 0
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

// Indexes
FileSchema.index({ userId: 1 });
FileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Increment download count when accessed
FileSchema.methods.incrementDownload = function() {
    this.downloadCount += 1;
    return this.save();
};

module.exports = mongoose.model('File', FileSchema);
