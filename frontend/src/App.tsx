import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageSelection } from './pages/LanguageSelection';
import { CodeEditor } from './pages/Editor';
import Signup from './pages/Signup';
import SignIn from './pages/SignIn';
import Home from './pages/Home';
import Protected from './pages/Protected';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path='*' element={<Navigate to='/' />} />
        {/* Protected Routes */}
        <Route path="/select-language" element={
          <Protected>
            <LanguageSelection />
          </Protected>
        } />
        <Route path="/editor/:language" element={
          <Protected>
            <CodeEditor />
          </Protected>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;