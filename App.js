import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import axios from 'axios';

// Components
import Navbar from './components/layout/Navbar';
import Alert from './components/layout/Alert';
import Home from './components/pages/Home';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MergePDF from './components/tools/MergePDF';
import SplitPDF from './components/tools/SplitPDF';
import CompressPDF from './components/tools/CompressPDF';
import PDFToWord from './components/tools/PDFToWord';
import PDFToExcel from './components/tools/PDFToExcel';
import PrivateRoute from './components/routing/PrivateRoute';

// Utils
import setAuthToken from './utils/setAuthToken';
import AuthContext from './context/auth/authContext';

// Styles
const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',
    },
    secondary: {
      main: '#ff9800',
    },
  },
});

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const App = () => {
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Set auth token
  useEffect(() => {
    if (localStorage.token) {
      setAuthToken(localStorage.token);
      loadUser();
    }
  }, []);

  // Load user
  const loadUser = async () => {
    try {
      const res = await axios.get('/api/auth/user');
      setUser(res.data);
      setIsAuthenticated(true);
    } catch (err) {
      localStorage.removeItem('token');
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Set alert
  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 5000);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        setLoading,
        loadUser,
        showAlert
      }}
    >
      <ThemeProvider theme={theme}>
        <Router>
          <CssBaseline />
          <Navbar />
          <Alert alert={alert} />
          <Switch>
            <Route exact path="/" component={Home} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/register" component={Register} />
            <PrivateRoute exact path="/merge" component={MergePDF} />
            <PrivateRoute exact path="/split" component={SplitPDF} />
            <PrivateRoute exact path="/compress" component={CompressPDF} />
            <PrivateRoute exact path="/pdf-to-word" component={PDFToWord} />
            <PrivateRoute exact path="/pdf-to-excel" component={PDFToExcel} />
          </Switch>
        </Router>
      </ThemeProvider>
    </AuthContext.Provider>
  );
};

export default App;
