const express = require('express');
const cors = require('cors');

/**
 * Creates the sync server instance.
 */
function createSyncServer({
  getStoryboard,
  saveStoryboard,
  getTheme,
  saveTheme,
  triggerRender,
  getRenderState
}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'YouTube Shorts Sync Server is active' });
  });

  app.get('/api/storyboard', async (req, res) => {
    try {
      const data = await getStoryboard();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/storyboard', async (req, res) => {
    try {
      await saveStoryboard(req.body);
      res.json({ success: true, message: 'Storyboard updated' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/theme', async (req, res) => {
    try {
      const data = await getTheme();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/theme', async (req, res) => {
    try {
      await saveTheme(req.body);
      res.json({ success: true, message: 'Theme settings updated' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/render', async (req, res) => {
    try {
      triggerRender(req.body);
      res.json({ success: true, message: 'Render process spawned on host' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/render/status', (req, res) => {
    res.json(getRenderState());
  });

  return app;
}

module.exports = { createSyncServer };
