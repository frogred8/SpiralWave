import './logger';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { GameController } from './controllers/game.controller';
import './config/db'; // Initialize database
import { requestMetricsService } from './services/request-metrics.service';

const fastify = Fastify({
  logger: false,
  trustProxy: true, // Enable trust proxy for correct client IP logging
});

requestMetricsService.start();

fastify.addHook('onResponse', async (request) => {
  const requestType = `${request.method} ${request.routeOptions.url || request.url}`;
  requestMetricsService.record(requestType, request.ip || 'unknown');
});

fastify.addHook('onClose', async () => {
  await requestMetricsService.stop();
});

// Handle favicon requests to prevent unnecessary errors in logs
fastify.get('/favicon.ico', (request, reply) => {
  reply.code(204).send();
});

// Basic health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Routes
fastify.post('/start', GameController.handleStart);
fastify.post('/end', GameController.handleEnd);
fastify.get('/leaderboard', GameController.handleGetLeaderboard);

// Metrics API
fastify.get('/api/metrics', async (request, reply) => {
  const hours = Number((request.query as any).hours) || 24;
  const data = await requestMetricsService.getMetricsData(hours);
  return data;
});

// Metrics Dashboard HTML
fastify.get('/metrics', async (request, reply) => {
  reply.type('text/html').send(`
<!DOCTYPE html>
<html>
<head>
  <title>SpiralWave Metrics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: sans-serif; margin: 20px; background: #111; color: #eee; }
    .chart-container { width: 100%; max-width: 800px; margin: 20px auto; background: #222; padding: 20px; border-radius: 8px; }
    h1 { text-align: center; }
  </style>
</head>
<body>
  <h1>Server Metrics (Last 24h)</h1>
  <div class="chart-container">
    <canvas id="typeChart"></canvas>
  </div>
  <div class="chart-container">
    <canvas id="ipChart"></canvas>
  </div>
  <script>
    async function loadMetrics() {
      const res = await fetch('/api/metrics');
      const data = await res.json();
      
      const types = {};
      const ips = {};
      
      // Group by type
      data.typeMetrics.forEach(m => {
        if (!types[m.request_type]) types[m.request_type] = 0;
        types[m.request_type] += m.request_count;
      });

      // Group by IP
      data.ipMetrics.forEach(m => {
        if (!ips[m.ip]) ips[m.ip] = 0;
        ips[m.ip] += m.request_count;
      });

      new Chart(document.getElementById('typeChart'), {
        type: 'bar',
        data: {
          labels: Object.keys(types),
          datasets: [{ label: 'Requests by Type', data: Object.values(types), backgroundColor: '#4ade80' }]
        },
        options: { responsive: true, color: '#eee', scales: { y: { beginAtZero: true, ticks: { color: '#eee' } }, x: { ticks: { color: '#eee' } } }, plugins: { legend: { labels: { color: '#eee' } } } }
      });

      new Chart(document.getElementById('ipChart'), {
        type: 'bar',
        data: {
          labels: Object.keys(ips),
          datasets: [{ label: 'Requests by IP', data: Object.values(ips), backgroundColor: '#60a5fa' }]
        },
        options: { responsive: true, color: '#eee', scales: { y: { beginAtZero: true, ticks: { color: '#eee' } }, x: { ticks: { color: '#eee' } } }, plugins: { legend: { labels: { color: '#eee' } } } }
      });
    }
    loadMetrics();
  </script>
</body>
</html>
  `);
});

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.register(cors, {
      origin: '*' // Allow all origins for development
    });

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '127.0.0.1';
    
    await fastify.listen({ port, host });
    console.log(`Server listening at http://${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
