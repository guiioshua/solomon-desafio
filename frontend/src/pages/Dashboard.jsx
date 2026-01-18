import { useEffect, useState } from 'react';
import { metricsApi, authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Grid, Paper, Typography, Button, 
  Box, CircularProgress 
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const response = await metricsApi.get('/metrics?start_date=2026-01-01');
      setData(response.data || []);
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        alert("Session expired. Please login again.");
        navigate('/');
      } else {
        console.error("Fetch error", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/');
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await authApi.post('/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || "Sync started!");
      setTimeout(() => {
        fetchData();
        setSyncing(false);
      }, 2000);
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.msg || "Sync failed";
      const details = error.response?.data?.details || "";
      alert(`Error: ${msg}\n${details}`);
      setSyncing(false);
    }
  };

  const totalRevenue = data.reduce((acc, cur) => acc + cur.total_revenue_approved, 0);
  const totalOrders = data.reduce((acc, cur) => acc + cur.count_approved, 0);
  const pendingOrders = data.reduce((acc, cur) => acc + cur.count_pending, 0);

  if (loading) return <CircularProgress sx={{ mt: 10, ml: '50%' }} />;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 1. HEADER SECTION */}
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Solomon Analytics
        </Typography>
        <Button 
          variant="contained" 
          color="secondary"
          onClick={handleSync} 
          disabled={syncing}
          sx={{ height: 40 }}
        >
          {syncing ? 'Syncing...' : 'Sync Data'}
        </Button>
      </Box>

      {/* 2. METRICS SECTION (The 3 Cards) */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', height: '100%' }}>
            <Typography color="textSecondary" variant="h6">Total Revenue</Typography>
            <Typography variant="h3" color="primary" sx={{ mt: 2 }}>
              R$ {totalRevenue.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', height: '100%' }}>
            <Typography color="textSecondary" variant="h6">Approved Orders</Typography>
            <Typography variant="h3" sx={{ mt: 2 }}>
              {totalOrders}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', height: '100%' }}>
            <Typography color="textSecondary" variant="h6">Pending Orders</Typography>
            <Typography variant="h3" color="warning.main" sx={{ mt: 2 }}>
              {pendingOrders}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. CHART SECTION (Completely Separated Box) */}
      <Box sx={{ mt: 6 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Revenue History
          </Typography>
          
          {/* Force minimum height and width to prevent "condensed" look */}
          <div style={{ width: '100%', height: 500, minHeight: '500px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={data} 
                margin={{ top: 20, right: 50, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`R$ ${value}`, 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue_approved" 
                  stroke="#1976d2" 
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2 }}
                  activeDot={{ r: 8 }} 
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      </Box>

    </Container>
  );
}