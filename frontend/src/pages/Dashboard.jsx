import { useEffect, useState } from 'react';
import { metricsApi, authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Grid, Paper, Typography, Button, 
  Box, CircularProgress, TextField, Divider, 
  Select, MenuItem, FormControl, InputLabel 
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SyncIcon from '@mui/icons-material/Sync';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all'); // NEW Requirement

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

  const fetchData = async (start = '', end = '', method = 'all') => {
    try {
      let query = '/metrics';
      const params = [];
      if (start) params.push(`start_date=${start}`);
      if (end) params.push(`end_date=${end}`);
      if (method && method !== 'all') params.push(`payment_method=${method}`);
      
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
  // Sync
  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await authApi.post('/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || "Sync started!");
      setTimeout(() => {
        fetchData(startDate, endDate, paymentMethod); 
        setSyncing(false);
      }, 2000);
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.msg || "Sync failed";
      alert(`Error: ${msg}`);
      setSyncing(false);
    }
  };

  const handleFilter = () => {
    setLoading(true);
    fetchData(startDate, endDate, paymentMethod);
  };

  // Métricas
  const totals = data.reduce((acc, cur) => ({
    revApproved: acc.revApproved + (cur.total_revenue_approved || 0),
    revPending: acc.revPending + (cur.total_revenue_pending || 0),
    revCancelled: acc.revCancelled + (cur.total_revenue_cancelled || 0),
    ordApproved: acc.ordApproved + (cur.count_approved || 0),
    ordPending: acc.ordPending + (cur.count_pending || 0),
    ordCancelled: acc.ordCancelled + (cur.count_cancelled || 0),
  }), { revApproved: 0, revPending: 0, revCancelled: 0, ordApproved: 0, ordPending: 0, ordCancelled: 0 });

  if (loading) return <CircularProgress sx={{ mt: 10, ml: '50%' }} />;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap">
        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mr: 4 }}>
          Solomon Analytics
        </Typography>

        {/* FILTER BAR */}
        <Paper elevation={1} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f5f5f5', flexWrap: 'wrap' }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          
          {/* NEW: Payment Method Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentMethod}
              label="Payment Method"
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <MenuItem value="all">All Methods</MenuItem>
              <MenuItem value="credit_card">Credit Card</MenuItem>
              <MenuItem value="pix">Pix</MenuItem>
              <MenuItem value="boleto">Boleto</MenuItem>
            </Select>
          </FormControl>

          <Button 
            variant="contained" 
            startIcon={<FilterAltIcon />}
            onClick={handleFilter}
          >
            Filter
          </Button>
        </Paper>

        <Button 
          variant="contained" 
          color="secondary"
          onClick={handleSync} 
          disabled={syncing}
          startIcon={<SyncIcon />}
          sx={{ height: 40, ml: 2 }}
        >
          {syncing ? 'Syncing...' : 'Sync'}
        </Button>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* ROW 1: FINANCIAL METRICS */}
      <Typography variant="h6" gutterBottom color="textSecondary">Financial Overview</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderLeft: '6px solid #4caf50' }}>
            <Typography variant="subtitle2">Revenue Approved</Typography>
            <Typography variant="h4" color="success.main">R$ {totals.revApproved.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderLeft: '6px solid #ff9800' }}>
            <Typography variant="subtitle2">Revenue Pending</Typography>
            <Typography variant="h4" color="warning.main">R$ {totals.revPending.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, borderLeft: '6px solid #f44336' }}>
            <Typography variant="subtitle2">Revenue Cancelled</Typography>
            <Typography variant="h4" color="error.main">R$ {totals.revCancelled.toFixed(2)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ROW 2: OPERATIONAL METRICS */}
      <Typography variant="h6" gutterBottom color="textSecondary">Operational Overview</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1">Approved Orders</Typography>
            <Typography variant="h5">{totals.ordApproved}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1">Pending Orders</Typography>
            <Typography variant="h5">{totals.ordPending}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1">Cancelled Orders</Typography>
            <Typography variant="h5">{totals.ordCancelled}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* CHART SECTION */}
      <Box sx={{ mt: 6 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>Revenue Trends</Typography>
          <div style={{ width: '100%', height: 500, minHeight: '500px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${value}`} />
                <Legend verticalAlign="top" height={36}/>
                
                {/* Multi-line requirement */}
                <Line name="Approved" type="monotone" dataKey="total_revenue_approved" stroke="#4caf50" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line name="Pending" type="monotone" dataKey="total_revenue_pending" stroke="#ff9800" strokeWidth={2} />
                <Line name="Cancelled" type="monotone" dataKey="total_revenue_cancelled" stroke="#f44336" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Paper>
      </Box>

    </Container>
  );
}