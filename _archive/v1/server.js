const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        participants: [],
        assignments: {}
    }));
}

// Read data from JSON file
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return { participants: [], assignments: {} };
    }
}

// Write data to JSON file
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// API Routes

// Get all data
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

// Get specific participant by ID
app.get('/api/participant/:id', (req, res) => {
    const data = readData();
    const participant = data.participants.find(p => p.id === req.params.id);
    if (participant) {
        res.json(participant);
    } else {
        res.status(404).json({ error: 'Participant not found' });
    }
});

// Add participant (admin only)
app.post('/api/participant', (req, res) => {
    const data = readData();
    const newParticipant = req.body;

    // Check if participant already exists
    const exists = data.participants.find(p => p.name === newParticipant.name);
    if (exists) {
        return res.status(400).json({ error: 'Participant already exists' });
    }

    data.participants.push(newParticipant);

    if (writeData(data)) {
        res.json({ success: true, participant: newParticipant });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Remove participant (admin only)
app.delete('/api/participant/:id', (req, res) => {
    const data = readData();
    data.participants = data.participants.filter(p => p.id !== req.params.id);
    delete data.assignments[req.params.id];

    if (writeData(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Save gift idea (Stage 1)
app.post('/api/gift-idea', (req, res) => {
    const { userId, giftIdea } = req.body;
    const data = readData();

    // Find participant
    const participant = data.participants.find(p => p.id === userId);
    if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
    }

    // Update participant with gift idea
    participant.giftIdea = giftIdea;
    participant.stage1Complete = true;

    if (writeData(data)) {
        res.json({ success: true, giftIdea });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Assign Secret Santa (Stage 2 - when user reveals)
app.post('/api/assign', (req, res) => {
    const { userId, assignedTo } = req.body;
    const data = readData();

    // Find participant
    const participant = data.participants.find(p => p.id === userId);
    if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
    }

    // Update participant
    participant.revealed = true;
    participant.assignedTo = assignedTo;
    participant.stage2Complete = true;
    data.assignments[userId] = assignedTo;

    if (writeData(data)) {
        res.json({ success: true, assignedTo });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Get available participants (not yet assigned)
app.get('/api/available/:userId', (req, res) => {
    const data = readData();
    const userId = req.params.userId;

    // Filter out: self, already assigned people
    const available = data.participants.filter(p =>
        p.id !== userId && !Object.values(data.assignments).includes(p.name)
    );

    res.json(available);
});

// Reset all data (admin only)
app.post('/api/reset', (req, res) => {
    const resetData = {
        participants: [],
        assignments: {}
    };

    if (writeData(resetData)) {
        res.json({ success: true, message: 'All data cleared' });
    } else {
        res.status(500).json({ error: 'Failed to reset data' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎅 Secret Santa server running on http://localhost:${PORT}`);
    console.log(`📊 Data stored in: ${DATA_FILE}`);
});
