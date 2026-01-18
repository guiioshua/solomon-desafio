import { useEffect, useState } from 'react';
import { metricsApi, authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Grid, Paper, Typography, Button, 
  Box, CircularProgress, Card, CardContent 
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  // Fetch
  const fetchData = async () => {
    try {
      // Valor default
      const response = await metricsApi.get('/metrics?start_date=2026-01-01');
      setData(response.data || []); // Para nulo
    } catch (error) {
      console.error("Fetch error", error);
      if (error.response && error.response.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  // OnLoad
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/');
    fetchData();
  }, []);

  // 3. Trigger Sync (Calls Backend 1)
  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      await authApi.post('/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Wait 2 seconds for Pipeline to finish (Naive approach, but works for MVP)
      setTimeout(() => {
        fetchData(); // Refresh data
        setSyncing(false);
      }, 2000);
    } catch (error) {
      alert("Sync failed");
      setSyncing(false);
    }
  };

  // Lógica para redução
  const totalRevenue = data.reduce((acc, cur) => acc + cur.total_revenue_approved, 0);
  const totalOrders = data.reduce((acc, cur) => acc + cur.count_approved, 0);
  const pendingOrders = data.reduce((acc, cur) => acc + cur.count_pending, 0);

  if (loading) return <CircularProgress sx={{ mt: 10, ml: '50%' }} />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Button variant="contained" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Data'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography color="primary" variant="h6">Total Revenue</Typography>
            <Typography component="p" variant="h4">
              R$ {totalRevenue.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography color="primary" variant="h6">Approved Orders</Typography>
            <Typography component="p" variant="h4">{totalOrders}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography color="warning.main" variant="h6">Pending Orders</Typography>
            <Typography component="p" variant="h4">{pendingOrders}</Typography>
          </Paper>
        </Grid>

        {/* Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Revenue History</Typography>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="total_revenue_approved" 
                    stroke="#1976d2" 
                    strokeWidth={2}
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}