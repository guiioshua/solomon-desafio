import { useEffect, useState } from 'react';
import { metricsApi, authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Grid, Paper, Typography, Button, 
  Box, CircularProgress, TextField, Stack, Divider 
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SyncIcon from '@mui/icons-material/Sync';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  // Seta valores default pra slice
  const setDefaultsFromData = (dataset) => {
    if (dataset && dataset.length > 0) {
      
      const dates = dataset.map(d => new Date(d.date));
      const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
      
      setStartDate(minDate);
      setEndDate(maxDate);
    }
  };

  // Fetch de analytics
  const fetchData = async (start = '', end = '') => {
    try {
       String
      let query = '/metrics';
      const params = [];
      if (start) params.push(`start_date=${start}`);
      if (end) params.push(`end_date=${end}`);
      
      if (params.length > 0) {
        query += '?' + params.join('&');
      }

      const response = await metricsApi.get(query);
      const resultData = response.data || [];
      setData(resultData);

      if (!start && !end) {
        setDefaultsFromData(resultData);
      }

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

  // 2. Sync Logic
  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await authApi.post('/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || "Sync started!");
      
      setTimeout(() => {
        // Dá fetch em tudo após sync
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

  const handleFilter = () => {
    setLoading(true);
    fetchData(startDate, endDate);
  };

  // Cálculo das métricas
  const totalRevenue = data.reduce((acc, cur) => acc + cur.total_revenue_approved, 0);
  const totalOrders = data.reduce((acc, cur) => acc + cur.count_approved, 0);
  const pendingOrders = data.reduce((acc, cur) => acc + cur.count_pending, 0);

  if (loading) return <CircularProgress sx={{ mt: 10, ml: '50%' }} />;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
      {/* HEADER & ACTIONS */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap">
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mr: 4 }}>
          Solomon Analytics
        </Typography>

        {/* DATE SLICE CONTROLS */}
        <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f5f5f5' }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Typography>-</Typography>
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button 
            variant="contained" 
            startIcon={<FilterAltIcon />}
            onClick={handleFilter}
          >
            Filter
          </Button>
        </Paper>

        {/* SYNC BUTTON */}
        <Button 
          variant="contained" 
          color="secondary"
          onClick={handleSync} 
          disabled={syncing}
          startIcon={<SyncIcon />}
          sx={{ height: 40, ml: 2 }}
        >
          {syncing ? 'Syncing...' : 'Sync Data'}
        </Button>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* METRICS CARDS */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', height: '100%' }}>
            <Typography color="textSecondary" variant="h6">Total Revenue (Sliced)</Typography>
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

      {/* CHART SECTION */}
      <Box sx={{ mt: 6 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Revenue History {startDate && endDate ? `(${startDate} to ${endDate})` : ''}
          </Typography>
          
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