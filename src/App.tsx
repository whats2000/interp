
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SO2Page from './pages/SO2Page';
import SO3MatrixPage from './pages/SO3MatrixPage';
import SO3QuaternionPage from './pages/SO3QuaternionPage';
import SO3NLERPPage from './pages/SO3NLERPPage';
import SE3ScLERPPage from './pages/SE3ScLERPPage';
import SE3DualQuatPage from './pages/SE3DualQuatPage';
import SE3DecoupledPage from './pages/SE3DecoupledPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="so2" element={<SO2Page />} />
        <Route path="so3-matrix" element={<SO3MatrixPage />} />
        <Route path="so3-quaternion" element={<SO3QuaternionPage />} />
        <Route path="so3-nlerp" element={<SO3NLERPPage />} />
        <Route path="se3-sclerp" element={<SE3ScLERPPage />} />
        <Route path="se3-dual-quat" element={<SE3DualQuatPage />} />
        <Route path="se3-decoupled" element={<SE3DecoupledPage />} />
      </Route>
    </Routes>
  );
}
