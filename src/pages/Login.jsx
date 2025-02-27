import React from 'react';
import LoginForm from '../components/LoginForm';
import { supabaseClient } from '../supabaseClient'; // Import supabaseClient

const Login = () => {
  const handleLogin = async (email, password) => {
    try {
      // Replace with your authentication logic
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return false; // Login failed
      }
      
      // Login successful
      // ...handle successful login (redirect, etc.)
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false; // Login failed
    }
  };
  
  return (
    <div className="login-page">
      <h1>Login to ParkEase</h1>
      <LoginForm onLogin={handleLogin} />
      
      {/* Other elements like "forgot password" link */}
      <div className="mt-4 text-center">
        <a href="/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </a>
      </div>
    </div>
  );
};

export default Login;