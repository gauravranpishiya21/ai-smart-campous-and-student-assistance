// Dedicated academic doubt-solving endpoints (auth is applied by api.use(auth) before this is mounted).
const D = require('../services/doubtSolver');
module.exports = (api, { h }) => {
  api.post('/ai/doubt-stream', (req, res) => D.sse(req, res, { text: req.body?.text, subject: req.body?.subject, mode: req.body?.mode, sessionId: req.body?.session_id }));
  api.get('/ai/doubt/session/:sid', h((req, res) => res.json(D.getSession(req.user.id, req.params.sid))));
};
