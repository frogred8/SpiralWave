import 'dotenv/config';
import './logger';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { GameController } from './controllers/game.controller';
import './config/db'; // Initialize database
import { requestMetricsService } from './services/request-metrics.service';

const fastify = Fastify({
  logger: false,
  trustProxy: true, // Enable trust proxy for correct client IP logging
});

const getClientDistDir = () => {
  const candidates = [
    process.env.CLIENT_DIST_DIR,
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(process.cwd(), 'apps/client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../../../client/dist'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
};

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
fastify.post('/leaderboard/reset', GameController.handleResetLeaderboard);

// Metrics API
fastify.get('/api/metrics', async (request, reply) => {
  const hours = Number((request.query as any).hours) || 24;
  const start = (request.query as any).start;
  const data = await requestMetricsService.getMetricsData(hours, start);
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
    .controls { text-align: center; margin-bottom: 20px; background: #222; padding: 15px; border-radius: 8px; max-width: 1000px; margin-left: auto; margin-right: auto; }
    .controls label { margin: 0 10px; }
    .controls input, .controls select, .controls button { padding: 5px; margin-left: 5px; background: #333; color: #eee; border: 1px solid #555; border-radius: 4px; }
    .controls button { cursor: pointer; background: #4ade80; color: #111; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Server Metrics</h1>
  <div class="controls">
    <label>Start Date: <input type="date" id="startDate"></label>
    <label>Time: 
      <select id="startHour">
        ${Array.from({length: 24}, (_, i) => `<option value="${i.toString().padStart(2, '0')}">${i}:00</option>`).join('')}
      </select>
    </label>
    <label>Duration: 
      <select id="duration">
        <option value="1">1 Hour</option>
        <option value="24" selected>24 Hours</option>
        <option value="168">1 Week</option>
      </select>
    </label>
    <button onclick="loadMetrics()">Apply</button>
  </div>
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

    let typeChart, ipChart;

    // Initialize default values
    const today = new Date();
    // Use local date for input
    const offset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - offset)).toISOString().slice(0, -1);
    document.getElementById('startDate').value = localISOTime.split('T')[0];
    document.getElementById('startHour').value = "00";

    async function loadMetrics() {
      const date = document.getElementById('startDate').value;
      const hour = document.getElementById('startHour').value;
      const durationHours = parseInt(document.getElementById('duration').value);
      
      let query = \`?hours=\${durationHours}\`;
      let startDt, endDt;

      if (date) {
        const localDateStr = \`\${date}T\${hour}:00:00\`;
        startDt = new Date(localDateStr);
        query += \`&start=\${startDt.toISOString()}\`;
      } else {
        startDt = new Date();
        startDt.setHours(startDt.getHours() - durationHours);
      }
      
      endDt = new Date(startDt.getTime() + durationHours * 60 * 60 * 1000);

      const res = await fetch('/api/metrics' + query);
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

      const commonOptions = {
        responsive: true,
        color: '#eee',
        scales: { 
          y: { beginAtZero: true, ticks: { color: '#eee' }, title: { display: true, text: 'Requests', color: '#eee' } }, 
          x: { 
            type: 'time', 
            time: { unit: durationHours <= 24 ? 'hour' : 'day' }, 
            ticks: { color: '#eee' }, 
            title: { display: true, text: 'Time', color: '#eee' },
            min: startDt.toISOString(),
            max: endDt.toISOString()
          } 
        }, 
        plugins: { legend: { labels: { color: '#eee' } } } 
      };

      if (typeChart) typeChart.destroy();
      typeChart = new Chart(document.getElementById('typeChart'), {
        type: 'line',
        data: { datasets: Object.values(typeDatasetsMap) },
        options: { ...commonOptions, plugins: { ...commonOptions.plugins, title: { display: true, text: 'Requests by Type', color: '#eee' } } }
      });

      // Process IP data for Bar Chart: Total count per IP
      const ipTotals = {};
      data.ipMetrics.forEach(m => {
        if (!ipTotals[m.ip]) ipTotals[m.ip] = 0;
        ipTotals[m.ip] += m.request_count;
      });

      // Sort and take top 20
      const top20Ips = Object.entries(ipTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      const ipLabels = top20Ips.map(item => item[0]);
      const ipCounts = top20Ips.map(item => item[1]);

      if (ipChart) ipChart.destroy();
      ipChart = new Chart(document.getElementById('ipChart'), {
        type: 'bar',
        data: {
          labels: ipLabels,
          datasets: [{
            label: 'Total Requests by IP (Top 20)',
            data: ipCounts,
            backgroundColor: ipLabels.map((_, i) => getColor(i + 3)),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          color: '#eee',
          scales: {
            y: { beginAtZero: true, ticks: { color: '#eee' }, title: { display: true, text: 'Total Requests', color: '#eee' } },
            x: { ticks: { color: '#eee', autoSkip: false }, title: { display: true, text: 'IP Address', color: '#eee' } }
          },
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Top 20 Requests by IP', color: '#eee' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return \`Total Requests: \${context.parsed.y}\`;
                }
              }
            }
          }
        }
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

    const clientDistDir = getClientDistDir();
    if (clientDistDir) {
      await fastify.register(fastifyStatic, {
        root: clientDistDir,
        prefix: '/',
      });

      fastify.setNotFoundHandler((request, reply) => {
        const acceptsHtml = request.headers.accept?.includes('text/html');
        if ((request.method === 'GET' || request.method === 'HEAD') && acceptsHtml) {
          return reply.type('text/html').sendFile('index.html');
        }

        return reply.code(404).send({ error: 'Not Found' });
      });
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('Client build output not found. Run npm run build before starting release mode.');
    }

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
