import React from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements
} from 'react-router-dom';
import { LanguageSelection } from './pages/LanguageSelection';
import { CodeEditor } from './pages/Editor';
import { CollabEditor } from './pages/CollabEditor';
import Signup from './pages/Signup';
import SignIn from './pages/SignIn';
import Home from './pages/Home';
import Protected from './pages/Protected';
import Toaster from './components/Toaster';

// Create router with future flags
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/signin" element={<SignIn />} />
      
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
      <Route path="/collab/:language/:sessionId" element={
        <Protected>
          <CollabEditor />
        </Protected>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <RouterProvider router={router} />
    </>
  );
}

export default App;

