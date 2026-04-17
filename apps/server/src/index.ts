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
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  <style>
    body { font-family: sans-serif; margin: 20px; background: #111; color: #eee; }
    .chart-container { width: 100%; max-width: 1000px; margin: 20px auto; background: #222; padding: 20px; border-radius: 8px; }
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
    const colors = ['#4ade80', '#60a5fa', '#f87171', '#fbbf24', '#c084fc', '#a78bfa', '#f472b6', '#34d399', '#2dd4bf'];
    function getColor(index) {
      return colors[index % colors.length];
    }

    async function loadMetrics() {
      const res = await fetch('/api/metrics');
      const data = await res.json();
      
      const typeDatasetsMap = {};
      data.typeMetrics.forEach(m => {
        if (!typeDatasetsMap[m.request_type]) {
          typeDatasetsMap[m.request_type] = {
            label: m.request_type,
            data: [],
            borderColor: getColor(Object.keys(typeDatasetsMap).length),
            tension: 0.1,
            fill: false
          };
        }
        typeDatasetsMap[m.request_type].data.push({ x: m.bucket_start, y: m.request_count });
      });

      const ipDatasetsMap = {};
      data.ipMetrics.forEach(m => {
        if (!ipDatasetsMap[m.ip]) {
          ipDatasetsMap[m.ip] = {
            label: m.ip,
            data: [],
            borderColor: getColor(Object.keys(ipDatasetsMap).length + 3),
            tension: 0.1,
            fill: false
          };
        }
        ipDatasetsMap[m.ip].data.push({ x: m.bucket_start, y: m.request_count });
      });

      const commonOptions = {
        responsive: true,
        color: '#eee',
        scales: { 
          y: { beginAtZero: true, ticks: { color: '#eee' }, title: { display: true, text: 'Requests', color: '#eee' } }, 
          x: { type: 'time', time: { unit: 'hour' }, ticks: { color: '#eee' }, title: { display: true, text: 'Time', color: '#eee' } } 
        }, 
        plugins: { legend: { labels: { color: '#eee' } } } 
      };

      new Chart(document.getElementById('typeChart'), {
        type: 'line',
        data: { datasets: Object.values(typeDatasetsMap) },
        options: { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'Requests by Type', color: '#eee' } } }
      });

      new Chart(document.getElementById('ipChart'), {
        type: 'line',
        data: { datasets: Object.values(ipDatasetsMap) },
        options: { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'Requests by IP', color: '#eee' } } }
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
